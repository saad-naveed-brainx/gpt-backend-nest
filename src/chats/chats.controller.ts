import { Controller, Post, Body, UseGuards, Req, Param, Get, UseInterceptors, UploadedFiles } from "@nestjs/common";
import { NewConversationDto } from "src/dto/newConversation.dto";
import { ChatsService } from "./chats.service";
import { AuthGuard } from "src/auth/auth.guard";
import { PromptDto } from "src/dto/prompt.dto";
import { FilesInterceptor } from "@nestjs/platform-express";

@Controller('c')
@UseGuards(AuthGuard)
export class ChatsController {

    constructor(private readonly chatsService: ChatsService) { }

    @Post('new-conversation')
    newConversation(@Body() data: NewConversationDto, @Req() req: Request) {
        data.userId = req['user'].sub;
        return this.chatsService.newConversation(data);
    }

    @Post('append-message')
    @UseInterceptors(FilesInterceptor('files', 10))
    appendMessage(@Body() data: PromptDto, @Req() req: Request, @UploadedFiles() files: Array<Express.Multer.File>) {
        data.userId = req['user'].sub;
        if (files.length == 0) {
            data.files = [];
            data.type = 'text';
        } else {
            data.files = files.map(file => {
                return {
                    fileName: file.originalname,
                }
            })
            data.type = files[0].mimetype.startsWith('image/') ? 'image' : files[0].mimetype === 'application/pdf' ? 'pdf' : 'text';
        }
        return this.chatsService.appendMessage(data, files);
    }

    @Get("/:conversationId/messages")
    getMessages(@Param('conversationId') conversationId: string) {
        return this.chatsService.getMessages(conversationId);
    }

    @Get('get-all-conversations')
    getAllConversations(@Req() req: Request) {
        return this.chatsService.getAllConversations(req['user'].sub);
    }
}