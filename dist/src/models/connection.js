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
        const uri = process.env.MongoDB_URI;
        if (!uri) {
            console.error("CRITICAL: MongoDB_URI is undefined. The .env file failed to load!");
            return; // Return instead of throwing, so the server stays alive!
        }
        // التعديل هنا: إضافة { family: 4 } كمعامل ثانٍ
        await mongoose_1.default.connect(uri, {
            family: 4
        });
        console.log("MongoDB connected successfully");
    }
    catch (error) {
        console.error("MongoDB connection failed:", error);
        throw error;
    }
};
exports.connectDB = connectDB;
