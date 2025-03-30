import mongoose, { Schema, Document } from "mongoose";

// UptimeData Interface
export interface IUptimeData extends Document {
  timestamp: Date;
  metadata: {
    deviceId: string;
    data: "connected" | "disconnected";
    timestamp: number; // Time in Milliseconds Unix Timestamp
  };
}

// UptimeData Schema
const UptimeDataSchema: Schema = new Schema(
  {
    timestamp: { type: Date, required: true },
    metadata: {
      deviceId: { type: String, required: true },
      data: { type: String, enum: ["connected", "disconnected"], required: true },
      timestamp: { type: Number, required: true }
    }
  },
  {
    timeseries: {
      timeField: 'timestamp',
      metaField: 'metadata',
      granularity: 'seconds'
    }
  }
);

// UptimeData Model
const UptimeData = mongoose.model<IUptimeData>("UptimeData", UptimeDataSchema);
export default UptimeData;
