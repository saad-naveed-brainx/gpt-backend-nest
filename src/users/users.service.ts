import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../models/user.schema';
import { CreateUserDto } from '../dto/createUser.dto';
import * as bcryptjs from 'bcrypt';
@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) { };
    async createUser(user: CreateUserDto) {
        const session = await this.userModel.db.startSession();
        session.startTransaction();
        try {
            const response = await this.findByEmail(user.email);
            if (response) {
                throw new BadRequestException('User already exists');
            }
            const salt = await bcryptjs.genSalt(10);
            const hashedPassword = await bcryptjs.hash(user.password, salt);
            user.password = hashedPassword;
            await this.userModel.create([user], { session });
            await session.commitTransaction();
            return { message: 'User Created Successfully' };
        } catch (err) {
            await session.abortTransaction();
            throw err;
        }
        finally {
            session.endSession();
        }
    }
    async findByEmail(email: string): Promise<User | null> {
        const user = await this.userModel.findOne({ email }).select('+password');
        return user;
    }
}
