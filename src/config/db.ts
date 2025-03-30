import mongoose from "mongoose";

export class DatabaseService {
  private static instance: DatabaseService;
  private isConnected: boolean = false;
  private uri: string;

  private constructor() {
    this.uri = process.env.MONGO_URI || "mongodb://localhost:27017/iot";

    // Set up connection event listeners
    mongoose.connection.on('connected', () => {
      console.log("MongoDB Connected! 🚀");
      this.isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      console.error("MongoDB connection error:", err);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log("MongoDB disconnected");
      this.isConnected = false;
    });
  }

  /**
   * Get the singleton instance of DatabaseService
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Connect to MongoDB
   */
  public async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await mongoose.connect(this.uri);
      } catch (error) {
        console.error("MongoDB connection failed:", error);
        throw error;
      }
    }
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Check if connected to MongoDB
   */
  public isConnectedToDb(): boolean {
    return this.isConnected;
  }
}

// Export a default singleton instance for backwards compatibility
const db = DatabaseService.getInstance();
export default db;

// Export connect function for backwards compatibility
export const connectDB = async (): Promise<void> => {
  try {
    await DatabaseService.getInstance().connect();
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};