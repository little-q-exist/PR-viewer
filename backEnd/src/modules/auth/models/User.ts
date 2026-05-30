import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  githubId: number;
  login: string;
  avatarUrl: string;
  email?: string;
  installationId: number;
  accessToken: string;
  tokenExpiresAt: Date;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    githubId: { type: Number, required: true, unique: true },
    login: { type: String, required: true },
    avatarUrl: { type: String, required: true },
    email: { type: String },
    installationId: { type: Number, required: true, index: true },
    accessToken: { type: String, required: true },
    tokenExpiresAt: { type: Date, required: true },
    refreshToken: { type: String },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>('User', UserSchema);
