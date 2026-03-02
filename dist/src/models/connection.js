"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// dotenv.config();
// export const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MongoDB_URI || "",)
//     console.log("MongoDB connected successfully");
//   } catch (error) {
//     console.error("MongoDB connection failed:", error);
//     // process.exit(1); // Exit the process with failure
//   }
// };
const connectDB = async () => {
    try {
        const uri = process.env.MongoDB_URI;
        if (!uri) {
            console.error("CRITICAL: MongoDB_URI is undefined. The .env file failed to load!");
            return; // Return instead of throwing, so the server stays alive!
        }
        await mongoose_1.default.connect(uri);
        console.log("MongoDB connected successfully");
    }
    catch (error) {
        console.error("MongoDB connection failed:", error);
        throw error;
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
