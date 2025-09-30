import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Prompts, PromptsSchema } from 'src/models/prompt.schema';
@Module({
    controllers: [ChatsController],
    imports: [UsersModule, MongooseModule.forFeature([{ name: Prompts.name, schema: PromptsSchema }])],
    providers: [ChatsService],
})
export class ChatsModule { }
