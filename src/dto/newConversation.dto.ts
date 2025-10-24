import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class NewConversationDto {
    @IsString()
    @IsNotEmpty()
    Prompt: string;

    @IsString()
    @IsOptional()
    userId: string;
}