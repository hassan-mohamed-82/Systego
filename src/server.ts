import express from "express";
import http from "http";
import { Server } from "socket.io";
import ApiRoute from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";
import { NotFound } from "./Errors";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { connectDB } from "./models/connection";
import { startCron, NotificationService } from "./utils/expiry_lowstock";

dotenv.config();
const app = express();

// Connect to DB
connectDB();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: "*" }));
app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api", ApiRoute);

// Not found middleware
app.use((req, res, next) => {
  throw new NotFound("Route not found");
});

// Error handler
app.use(errorHandler);

// Create server & socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// 🔌 Socket.IO connection
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// 🕒 Start cron jobs (expiry & low stock check)
startCron(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
