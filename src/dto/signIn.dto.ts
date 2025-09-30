import { IsString, IsEmail, IsNotEmpty } from 'class-validator';
export class SignInDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;
    @IsString()
    @IsNotEmpty()
    password: string;
}
