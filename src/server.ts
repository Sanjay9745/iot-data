import express, { Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import morgan from "morgan";
import dataProducer from "./lib/dataProducer";
import userRoutes from "./routes/user/user.routes";
import deviceRoutes from "./routes/device/device.routes";
import { connectDB } from "./config/db";

const app = express();
const PORT = process.env.PORT || 5000;
connectDB()
dataProducer();
app.use(morgan("dev")); // Logging middleware
app.use(express.json());
app.use(cors());
app.use("/api/users", userRoutes);
app.use("/api/devices", deviceRoutes);

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello, Express with TypeScript! 🚀" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
