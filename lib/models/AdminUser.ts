import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAdminUser extends Document {
  username: string;
  passwordHash: string;
  passwordSalt: string;
  name: string;
  role: string;
  created_at: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, default: "coordinator" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

export const AdminUserModel: Model<IAdminUser> =
  mongoose.models.AdminUser || mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);
