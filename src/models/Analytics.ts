import mongoose, { Schema, Document } from "mongoose";

// Analytics Interface
export interface IAnalytics extends Document {
  timestamp: Date;
  metadata: {
    deviceId: string;
    data: 0 | 1;
    timestamp: number; // Time in Milliseconds Unix Timestamp
  };
}

// Analytics Schema
const AnalyticsSchema: Schema = new Schema(
  {
    timestamp: { type: Date, required: true },
    metadata: {
      deviceId: { type: String, required: true },
      data: { type: Number, enum: [0, 1], required: true },
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

// Analytics Model
const Analytics = mongoose.model<IAnalytics>("Analytics", AnalyticsSchema);
export default Analytics;
