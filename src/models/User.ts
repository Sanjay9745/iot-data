import mongoose, { Schema, Document } from "mongoose";

// User Interface
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
  createdAt: Date;
}

// User Schema
const UserSchema: Schema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
  },
  { timestamps: true }
);

// User Model
const User = mongoose.model<IUser>("User", UserSchema);
export default User;
