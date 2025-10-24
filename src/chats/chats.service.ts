import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Prompts } from "../models/prompt.schema";
import { NewConversationDto } from "src/dto/newConversation.dto";
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { ConfigService } from "@nestjs/config";
import { PromptDto } from "src/dto/prompt.dto";
import { PdfProcessorService } from "./PdfProcessorService";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

@Injectable()
export class ChatsService {
    private openai: OpenAI;
    private conversationId: string;
    constructor(@InjectModel(Prompts.name) private PromptsModel: Model<Prompts>, private configService: ConfigService, private readonly pdfProcessorService: PdfProcessorService) {
        this.openai = new OpenAI({
            apiKey: this.configService.get('OPENAI_API_KEY'),
        });
    }

    async newConversation(data: NewConversationDto) {
        try {
            this.conversationId = uuidv4();
            const userPrompt = new this.PromptsModel({
                conversationId: this.conversationId,
                userId: data.userId,
                role: 'user',
                type: 'text',
                content: data.Prompt,
            })
            userPrompt.save();
            await this.appendMessageAndSaveResponse([userPrompt]);
            return {
                conversationId: this.conversationId,
                messages: [userPrompt],
                success: true,
            }

        } catch (err) {
            throw err;
        }
    }


    async ragOrNoRag(userQuestion: string): Promise<"RAG" | "NO_RAG"> {
        try {
            const promptsTillNow = await this.PromptsModel.find({ conversationId: this.conversationId });

            const documents = promptsTillNow
                .flatMap(p => p.files || [])
                .map(f => ({
                    fileName: f.fileName,
                    summary: f.summary || "No summary available",
                }));

            const documentContext =
                documents.length > 0
                    ? documents
                        .map((doc, idx) => `Document ${idx + 1}: ${doc.fileName}\nSummary: ${doc.summary}`)
                        .join("\n\n")
                    : "No documents uploaded.";

            console.log("documentContext is", documentContext)

            const messages: ChatCompletionMessageParam[] = [
                {
                    role: "system",
                    content:
                        `You are an intelligent classifier that determines whether a user's question requires retrieving information from uploaded documents.
                        If the question clearly refers to content within the user's uploaded files, respond with "RAG".
                        If the question is general and not related to the uploaded documents, respond with "NO_RAG".

                        Answer ONLY with one of the two words: RAG or NO_RAG.
                        `,
                },
                {
                    role: "user",
                    content: `
                        User Question: "${userQuestion}"

                        Uploaded Document Metadata:
                        ${documentContext}`,
                },
            ];

            const classification = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages,
                temperature: 0,
            });

            const messageContent = classification.choices[0]?.message?.content?.trim().toUpperCase();

            if (messageContent === "RAG" || messageContent === "NO_RAG") {
                return messageContent as "RAG" | "NO_RAG";
            }

            return "NO_RAG";
        } catch (err) {
            console.error("Error in ragOrNoRag function:", err);
            throw err;
        }
    }




    async createContext(userQuestion: string, userID: string) {
        try {
            const matchedVectors = await this.pdfProcessorService.queryPinecone(userID, userQuestion, 10);
            const context = matchedVectors
                .map(match => match.text)
                .join("\n\n");
            return context;
        } catch (err) {
            console.log("error in create context service function", err);
            throw err;
        }
    }

    async appendMessage(data: PromptDto, files?: Array<Express.Multer.File>) {
        try {
            this.conversationId = data.conversationId;
            let context = '';
            const userPrompt = new this.PromptsModel({
                conversationId: this.conversationId,
                userId: data.userId,
                role: 'user',
                content: data.content,
                type: data.type,
                files: data.files ? data.files : [],
            });
            await userPrompt.save();

            if (files && files.length > 0 && data.type === 'pdf') {
                await this.pdfProcessorService.processPDF(files, userPrompt._id);
            }

            const check = await this.ragOrNoRag(data.content);
            console.log("RAG or NO_RAG decision:", check);

            if (check === 'RAG') {
                context = await this.createContext(data.content, data.userId);
            }

            const promptsTillNow = await this.PromptsModel.find({ conversationId: this.conversationId });

            await this.appendMessageAndSaveResponse(promptsTillNow, context);
            return this.getMessages(this.conversationId);
        }
        catch (err) {
            console.log("error in append message service function", err);
            throw err;
        }
    }

    async getMessages(conversationId: string) {
        try {
            if (!conversationId) {
                throw new BadRequestException("Conversation ID is required");
            }
            const messages = await this.PromptsModel.find({ conversationId }).sort({ createdAt: 1 });
            if (!messages.length) throw new BadRequestException("No chat found");

            return { success: true, messages };
        } catch (err) {
            console.log("error in get messages service function", err);
            throw err;
        }
    }

    async getAllConversations(userId: string) {
        try {
            const conversations = await this.PromptsModel.aggregate([
                { $match: { userId } },
                { $group: { _id: "$conversationId", latest: { $max: "$createdAt" }, title: { $first: "$content" } } },
                { $sort: { latest: -1 } }
            ]);

            if (!conversations.length) {
                return {
                    success: false,
                    message: "No conversations found"
                }
            }
            return { success: true, conversations };
        } catch (err) {
            console.log("error in get all conversations service function", err);
            throw err;
        }
    }

    async appendMessageAndSaveResponse(promptsList: Prompts[], context: string = '') {
        try {
            const systemPrompt = {
                role: 'system' as const,
                content: `You are ChatGPT, a helpful and knowledgeable AI assistant.
            - Always provide clear, accurate, and well - structured answers.
            - Be concise but detailed enough for practical use.
            - If asked to do something unsafe, unethical, or outside your capabilities, politely refuse.
            - When unsure, state your limitations honestly rather than guessing.`,
            };

            if (context) {
                const lastPrompt = promptsList[promptsList.length - 1];
                lastPrompt.content = lastPrompt.content + `Answer the question from this context. This context is being attached from system.
                context: ${context}`
            }

            const messages: ChatCompletionMessageParam[] = [
                systemPrompt,
                ...promptsList.map((p) => ({
                    role: p.role as 'user' | 'assistant',
                    content: p.content || '',
                })),
            ];

            const r = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages,
            });

            const convertedResponse = new this.PromptsModel({
                conversationId: promptsList[0].conversationId,
                userId: promptsList[0].userId,
                role: 'assistant',
                type: 'text',
                content: r.choices[0].message.content,
            });

            await convertedResponse.save();

        } catch (err) {
            console.log("error in appendMessageAndSaveResponse:", err);
            throw err;
        }
    }
}

