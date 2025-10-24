import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { ConfigService } from "@nestjs/config";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from 'openai';
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Prompts } from "../models/prompt.schema";

@Injectable()
export class PdfProcessorService {

    private readonly embeddingsModel: any;
    private readonly pineconeClient: any;
    private userId: string;
    private readonly openai: OpenAI;

    constructor(private configService: ConfigService, @InjectModel(Prompts.name) private PromptsModel: Model<Prompts>) {
        this.embeddingsModel = new OpenAIEmbeddings({
            apiKey: this.configService.get('OPENAI_API_KEY'),
        });
        this.pineconeClient = new Pinecone({
            apiKey: this.configService.get('PINECONE_API_KEY')!,
        });
        this.openai = new OpenAI({
            apiKey: this.configService.get('OPENAI_API_KEY')
        });
    }

    async processPDF(files: Array<Express.Multer.File>, documentReference) {
        if (documentReference) {
            const existingPrompt = await this.PromptsModel.findById(documentReference.toString());
            if (!existingPrompt) {
                throw new Error('Prompt not found for the given document reference.');
            } else {
                this.userId = existingPrompt.userId.toString();
            }
        }
        for (const file of files) {
            const text = await this.extractTextFromPdf(file);
            const summary = await this.createSummaryOftheDocument(text);
            await this.saveSummaryDataInDb(file.originalname, summary, documentReference);
            const chuncks = await this.chunckText(text);
            const embeddings = await this.storeEmbeddingsInPinecone(chuncks, file.originalname);
        }
    }

    async saveSummaryDataInDb(fileName: string, summary: string, documentReference) {
        const existingPrompt = await this.PromptsModel.findById(documentReference);
        if (!existingPrompt) {
            throw new Error('Prompt not found for the given document reference.');
        } else {
            this.userId = existingPrompt.userId.toString();
        }

        console.log("Saving summary for file:", fileName, "with summary:", summary);

        existingPrompt.files = existingPrompt.files?.map((file) => {
            if (file.fileName === fileName) {
                console.log("matched ");
                return { ...file, summary };
            }
            return file;
        });

        await existingPrompt.save();
    }

    async createSummaryOftheDocument(text: string) {
        const maxLenght = 8000;
        const inputText = text.length > maxLenght ? text.slice(0, maxLenght) : text;

        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `
                            You are an expert AI assistant specialized in document summarization.
                            Your goal is to generate a concise, information-rich summary that will be stored as the document's metadata in a database.

                            Guidelines:
                            - Focus only on what the document mainly contains (topics, entities, purpose, and key sections).
                            - Do not include opinions, interpretations, or unnecessary details.
                            - Keep the summary short, clear, and keyword-focused so another LLM can quickly understand the document's content at a glance.
                            - Avoid filler words like "This document discusses..." — go straight to the main subjects.
                            - Output should be in plain text (no bullet points or formatting).

                            Example Output:
                            "This document is a technical report on renewable energy solutions, covering solar and wind power technologies, their implementation strategies, cost-benefit analyses, and case studies from various regions."
                            `
                },
                {
                    role: 'user',
                    content: `Generate a concise metadata summary for the following document text:\n\n${inputText}`
                }
            ],
        });

        return response.choices[0].message.content ?? 'No summary generated.';
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

    async storeEmbeddingsInPinecone(chunks: string[], fileName: string) {
        const index = this.pineconeClient.index('gpt').namespace(`user_${this.userId}`);
        const embeddings = await this.embeddingsModel.embedDocuments(chunks);
        const vectors = embeddings.map((embeddings, index) => {
            return {
                id: `${fileName}_${index}`,
                values: embeddings,
                metadata: {
                    user: this.userId,
                    fileName,
                    chunkIndex: index,
                    text: chunks[index],
                }
            }
        })
        await index.upsert(vectors);
    }

    async queryPinecone(userId: string, query: string, topK: number = 5) {
        console.log('Querying pinecone for user:', userId, 'with query:', query);

        const queryEmbedding = await this.embeddingsModel.embedQuery(query);

        const index = this.pineconeClient.index('gpt').namespace(`user_${userId}`);

        const results = await index.query({
            topK,
            vector: queryEmbedding,
            includeMetadata: true,
        })

        const matches = results.matches.map((match) => ({
            score: match.score,
            text: match.metadata?.text,
            fileName: match.metadata.fileName,
            chunkIndex: match.metadata.chunkIndex,
        }));

        return matches;
    }
}
