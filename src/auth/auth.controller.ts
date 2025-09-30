import { Controller, HttpCode, HttpStatus, Res, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Post, Body, Get } from '@nestjs/common';
import { CreateUserDto } from '../dto/createUser.dto';
import { SignInDto } from '../dto/signIn.dto';
import type { Response, Request } from 'express';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { };

    @Post('/create-user')
    @HttpCode(HttpStatus.CREATED)
    createUser(@Body() dto: CreateUserDto) {
        return this.authService.createUserService(dto);
    }

    @HttpCode(HttpStatus.OK)
    @Post('/sign-in')
    async SignInDto(@Body() SignInDto: SignInDto, @Res() res: Response) {
        const result = await this.authService.signInService(SignInDto, res);
        return res.json(result);
    }

    @HttpCode(HttpStatus.OK)
    @Get('me')
    @UseGuards(AuthGuard)
    async isLoggedIn(@Req() req: Request) {
        const user = req.user as CreateUserDto;
        return this.authService.isLoggedInService(user);
    }

    @HttpCode(HttpStatus.OK)
    @Get('/get-profile')
    @UseGuards(AuthGuard)
    async getProfile(@Req() req: Request) {
        const user = req.user as CreateUserDto;
        return this.authService.getProfileService(user?.email);
    }

    @HttpCode(HttpStatus.OK)
    @Post('/sign-out')
    async signOut(@Res() res: Response) {
        res.clearCookie('access_token');
        return res.json({ message: 'User logged out successfully' });
    }
}
