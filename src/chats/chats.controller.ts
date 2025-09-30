import { Controller, Post, Body, UseGuards, Req, Param, Get } from "@nestjs/common";
import { NewConversationDto } from "src/dto/newConversation.dto";
import { ChatsService } from "./chats.service";
import { AuthGuard } from "src/auth/auth.guard";

@Controller('c')
@UseGuards(AuthGuard)
export class ChatsController {

    constructor(private readonly chatsService: ChatsService) { }

    @Post('new-conversation')
    newConversation(@Body() data: NewConversationDto, @Req() req: Request) {
        data.userId = req['user'].sub;
        return this.chatsService.newConversation(data);
    }

    @Get("/:conversationId/messages")
    getMessages(@Param('conversationId') conversationId: string) {
        return this.chatsService.getMessages(conversationId);
    }
}