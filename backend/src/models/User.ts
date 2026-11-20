import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    email: string;
    password_hash: string;
    created_at: Date;
    updated_at: Date;
}

const UserSchema: Schema = new Schema({
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.model<IUser>('User', UserSchema);
