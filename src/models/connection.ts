import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
  try {
    const uri = process.env.MongoDB_URI;

    if (!uri) {
      console.error("CRITICAL: MongoDB_URI is undefined. The .env file failed to load!");
      return; // Return instead of throwing, so the server stays alive!
    }

    // التعديل هنا: إضافة { family: 4 } كمعامل ثانٍ
    await mongoose.connect(uri, {
      family: 4
    });
    
    console.log("MongoDB connected successfully");

    // 🛠️ Auto-fix for Cart Indexes (Run once to fix E11000 errors)
    try {
      const db = mongoose.connection.db;
      if (db) {
        const cartCollection = db.collection('carts');
        await cartCollection.dropIndex("user_1").catch(() => {});
        await cartCollection.dropIndex("sessionId_1").catch(() => {});
      }
    } catch (indexError) {
      // Ignore if indexes don't exist or drop fails
    }

  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};