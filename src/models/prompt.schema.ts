import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './user.schema';

export type PromptsDocument = HydratedDocument<Prompts>;

@Schema(
    {
        timestamps: true,
        collection: 'prompts',
    }
)
export class Prompts {
    @Prop({ required: true })
    conversationId: string;

    @Prop({
        required: true,
        type: Types.ObjectId,
        ref: User.name,
    })
    userId: Types.ObjectId;

    @Prop({ required: true, enum: ['system', 'user', 'assistant'] })
    role: string;

    @Prop({ required: false, enum: ['text', 'pdf', 'image'] })
    type?: string;

    @Prop({
        required: false,
    })
    content?: string;

    @Prop({
        required: false,
        type: [{
            fileId: String,
            fileName: String,
            url: String,
            summary: String,
        }],
        default: [],
    })
    files?: Array<{
        fileId: string;
        fileName: string;
        url: string;
        summary?: string;
    }>;
}

export const PromptsSchema = SchemaFactory.createForClass(Prompts);