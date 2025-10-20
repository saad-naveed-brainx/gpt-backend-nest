import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Prompts, PromptsSchema } from 'src/models/prompt.schema';
import { PdfProcessorService } from './PdfProcessorService';
@Module({
    controllers: [ChatsController],
    imports: [UsersModule, MongooseModule.forFeature([{ name: Prompts.name, schema: PromptsSchema }])],
    providers: [ChatsService, PdfProcessorService],
})
export class ChatsModule { }
