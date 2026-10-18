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

    console.log("Connecting to MongoDB:", uri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@"));

    // OU,O�O1O_USU, U�U+O: O�OOU?Oc { family: 4 } U�U.O1OU.U, O�OU+U?
    await mongoose.connect(uri, {
      family: 4,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });

    mongoose.set("bufferCommands", false);

    console.log("MongoDB connected successfully");


  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};