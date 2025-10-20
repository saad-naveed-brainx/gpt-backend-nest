import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { ConfigService } from "@nestjs/config";
import { Pinecone } from "@pinecone-database/pinecone";
import { metadata } from 'reflect-metadata/no-conflict';

@Injectable()
export class PdfProcessorService {

    private readonly embeddingsModel: any;
    private readonly pineconeClient: any;
    private userId: string;

    constructor(private configService: ConfigService) {
        this.embeddingsModel = new OpenAIEmbeddings({
            apiKey: this.configService.get('OPENAI_API_KEY'),
        });
        this.pineconeClient = new Pinecone({
            apiKey: this.configService.get('PINECONE_API_KEY')!,
        })
    }

    async processPDF(files: Array<Express.Multer.File>, userID: string) {
        const allEmbeddings = [];
        if (userID) {
            this.userId = userID;
        }
        for (const file of files) {
            const text = await this.extractTextFromPdf(file);
            console.log('Extracted text length:', text);
            const chuncks = await this.chunckText(text);
            console.log('Number of chunks:', chuncks);
            const embeddings = await this.createEmbeddings(chuncks);
            console.log('Created embeddings for file:', embeddings);
        }
    }

    async extractTextFromPdf(file: Express.Multer.File) {
        const parser = new PDFParse({ data: file.buffer });
        const textResult = await parser.getText();
        await parser.destroy()
        return textResult.text;
    }

    async chunckText(text: string) {
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const chuncks = await textSplitter.splitText(text);
        return chuncks;
    }

    async createEmbeddings(chuncks: string[]) {
        const vectorStore = await MemoryVectorStore.fromTexts(
            chuncks,
            chuncks.map((_, i) => ({ id: i.toString() })),
            this.embeddingsModel
        );
        return vectorStore;
    }

    async storeEmbeddingsInPinecone(embeddings, fileName: string) {
        const index = this.pineconeClient.index('gpt').namespace(`user_${this.userId}`);

        const vectors = embeddings.map((embeddings, index) => {
            return {
                id: `${fileName}_${index}`,
                embeddings,
                metadata: {
                    user: this.userId,
                    fileName,
                    chunkIndex: index,
                }
            }
        })
        await index.upsert(vectors);
    }

}
