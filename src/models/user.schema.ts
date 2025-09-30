import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema(
    {
        timestamps: true,
        collection: 'users',
        versionKey: '__v',
    }
)
export class User {
    @Prop({ required: true })
    name: string;

    @Prop({ unique: true, index: true })
    email: string;

    @Prop({
        select: false,
    })
    password: string;

}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);