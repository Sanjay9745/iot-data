import mongoose, { Schema, Document } from "mongoose";

// Device Interface
export interface IDevice extends Document {
  name: string;
  deviceId: string;
  location: string;
  status: "active" | "inactive";
  createdAt: Date;
}

// Device Schema
const DeviceSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    deviceId: { type: String, required: true, unique: true },
    location: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

// Device Model
const Device = mongoose.model<IDevice>("Device", DeviceSchema);
export default Device;
