import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from '../dto/createUser.dto';
import { UsersService } from '../users/users.service';
import { SignInDto } from '../dto/signIn.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcryptjs from 'bcrypt';
import { Response } from 'express';
import { User } from '../models/user.schema';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService, private jwtService: JwtService) { }
    async createUserService(dto: CreateUserDto): Promise<{ message: string }> {
        return await this.usersService.createUser(dto);
    }

    async signInService(dto: SignInDto, res: Response) {

        const user = await this.usersService.findByEmail(dto.email);

        if (!user) {
            throw new UnauthorizedException('User not found.');
        }
        const isPasswordValid = await bcryptjs.compare(dto.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Incorrect password');
        }
        const payload = { sub: (user as any)._id, email: user.email };
        const token = await this.jwtService.signAsync(payload);
        res.cookie('access_token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 2 * 24 * 60 * 60 * 1000,
        });

        return {
            message: 'User logged in successfully',
            user: {
                name: user.name,
                email: user.email
            },
            token: token
        }
    }

    async isLoggedInService(user: CreateUserDto) {
        try {
            if (user) {
                const loggedInUser = await this.getProfileService(user.email);
                return {
                    isLoggedIn: true,
                    user: loggedInUser
                }
            }
            else {
                return {
                    isLoggedIn: false,
                    user: null
                }
            }
        } catch (err) {
            throw err;
        }
    }


    async getProfileService(email: string | null): Promise<User | null> {
        try {
            if (!email) {
                throw new UnauthorizedException('Email is required');
            }
            const user = await this.usersService.findByEmail(email);
            return user;
        } catch (err) {
            throw err;
        }
    }
}
