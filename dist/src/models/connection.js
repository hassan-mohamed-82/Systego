"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(process.env.MongoDB_URI || "");
        console.log("MongoDB connected successfully");
    }
    catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1); // Exit the process with failure
    }
};
exports.connectDB = connectDB;
// import mongoose from "mongoose";
// export const connectDB = async () => {
//   try {
//     await mongoose.connect('mongodb://62.84.185.153:27017/systegoMongo', {
//       user: 'admin',
//       pass: 'MONGO@3030',
//       authSource: 'admin'
//     })
//     console.log("MongoDB connected successfully");
//   } catch (error) {
//     console.error("MongoDB connection failed:", error);
//     process.exit(1);
//   }
// };
