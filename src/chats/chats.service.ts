import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Prompts } from "../models/prompt.schema";
import { NewConversationDto } from "src/dto/newConversation.dto";
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { ConfigService } from "@nestjs/config";
import { PromptDto } from "src/dto/prompt.dto";

@Injectable()
export class ChatsService {
    private openai: OpenAI;
    private conversationId: string;
    constructor(@InjectModel(Prompts.name) private PromptsModel: Model<Prompts>, private configService: ConfigService) {
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
            this.appendMessageAndSaveResponse([userPrompt]);
            return {
                conversationId: this.conversationId,
                messages: [userPrompt],
                success: true,
            }

        } catch (err) {
            throw err;
        }
    }

    async getMessages(conversationId: string) {
        try {
            console.log("get all messages function is running")
            if (!conversationId) {
                throw new BadRequestException("Conversation ID is required");
            }

            const conversation = await this.PromptsModel.findOne({ conversationId });
            if (!conversation) {
                throw new BadRequestException("No chat found with this conversation ID");
            }

            const messages = await this.PromptsModel.find({ conversationId }).sort({
                createdAt: 1,
            });
            return {
                messages,
                success: true,
            }
        } catch (err) {
            console.log("error in get messages service function", err);
            throw err;
        }
    }

    async appendMessageAndSaveResponse(promptsList: Prompts[]) {
        try {
            const firstPromptToAppend = new this.PromptsModel({
                conversationId: this.conversationId,
                userId: promptsList[0].userId,
                role: 'system',
                type: 'text',
                content: `You are ChatGPT, a helpful and knowledgeable AI assistant.
                        - Always provide clear, accurate, and well-structured answers.
                        - Be concise but detailed enough for practical use.
                        - If asked to do something unsafe, unethical, or outside your capabilities, politely refuse.
                        - When unsure, state your limitations honestly rather than guessing.
                        `,
            })

            promptsList.unshift(firstPromptToAppend);


            const r = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: promptsList.map(prompt => ({
                    role: prompt.role as 'system' | 'user' | 'assistant',
                    content: prompt.content!,
                }))
            })


            const convertedResponse = new this.PromptsModel({
                conversationId: promptsList[0].conversationId,
                userId: promptsList[0].userId,
                role: 'assistant',
                type: 'text',
                content: r.choices[0].message.content,
            })


            await convertedResponse.save();


        } catch (err) {
            console.log("error in append message and get response service function", err);
            throw err;
        }
    }
}

