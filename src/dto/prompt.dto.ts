import { IsString, IsNotEmpty, IsArray, IsObject, IsOptional } from 'class-validator';

export class PromptDto {
    @IsString()
    @IsNotEmpty()
    conversationId: string;


    @IsString()
    @IsNotEmpty()
    role: string;


    @IsString()
    @IsNotEmpty()
    type: string;


    @IsString()
    @IsOptional()
    userId: string;


    @IsString()
    @IsOptional()
    content: string;


    @IsArray()
    @IsOptional()
    files: Array<{
        fileId: string;
        fileName: string;
        fileType: string;
        url: string;
    }>;
}