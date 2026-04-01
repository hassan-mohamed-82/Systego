import dotenv from "dotenv";
import path from "path";

// __dirname in your compiled file is dist/src/
// We go up two directories to hit the root where the .env file lives
const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

import express from "express";
import http from "http";
import { Server } from "socket.io";
import ApiRoute from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";
import { NotFound } from "./Errors";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { connectDB } from "./models/connection";
import { startCron } from "./utils/expiry_lowstock";
import { seedOrderTypes } from "./seed/ordertype";
import "./utils/bookingcheck";

const app = express();

// 🧠 Security & middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: "*" }));
app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ✅ استخدم المسار الصحيح للـ uploads حتى بعد build
const uploadsPath = path.join(__dirname, "../uploads");
app.use("/uploads", express.static(uploadsPath));

// 🚀 Routes
app.use("/api", ApiRoute);

// ❌ Not found middleware
app.use((req, res, next) => {
  throw new NotFound("Route not found");
});

// ⚠️ Error handler
app.use(errorHandler);

// ⚙️ Create server & socket.io
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

const PORT = process.env.PORT || 3000;

// ==========================================
// 🚀 التعديل الأهم: دالة مجمعة لتشغيل السيرفر
// ==========================================
const startServer = async () => {
  try {
    // 1. استنى الداتا بيز تـ connect الأول
    await connectDB();
    
    // 2. بعدين استنى الـ seed يخلص
    await seedOrderTypes();

    // 3. دلوقتي بس تقدر تشغل الـ crons والسيرفر بأمان
    startCron(io);

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });

  } catch (error) {
    // لو الداتا بيز فشلت، اقفل السيرفر بدل ما يفضل شغال على الفاضي ويجيب errors
    console.error("❌ Failed to start the server due to database connection error!");
    process.exit(1); 
  }
};

// شغل الدالة
startServer();