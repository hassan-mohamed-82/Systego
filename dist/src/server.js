"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const index_1 = __importDefault(require("./routes/index"));
const errorHandler_1 = require("./middlewares/errorHandler");
const Errors_1 = require("./Errors");
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const connection_1 = require("./models/connection");
const expiry_lowstock_1 = require("./utils/expiry_lowstock");
require("./utils/bookingcheck");
dotenv_1.default.config();
const app = (0, express_1.default)();
// 🧩 Connect to DB
(0, connection_1.connectDB)();
// 🧠 Security & middleware
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: false }));
app.use((0, cors_1.default)({ origin: "*" }));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: "20mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "20mb" }));
// ✅ استخدم المسار الصحيح للـ uploads حتى بعد build
const uploadsPath = path_1.default.join(__dirname, "../uploads");
app.use("/uploads", express_1.default.static(uploadsPath));
// 🚀 Routes
app.use("/api", index_1.default);
// ❌ Not found middleware
app.use((req, res, next) => {
    throw new Errors_1.NotFound("Route not found");
});
// ⚠️ Error handler
app.use(errorHandler_1.errorHandler);
// ⚙️ Create server & socket.io
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: { origin: "*" },
});
// 🔌 Socket.IO connection
io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("❌ User disconnected:", socket.id);
    });
});
// 🕒 Start cron jobs
(0, expiry_lowstock_1.startCron)(io);
const PORT = process.env.PORT || 3000;
// 🚀 Start server
server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
