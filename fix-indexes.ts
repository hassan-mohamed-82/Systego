import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load .env from current directory
dotenv.config();

const fixIndexes = async () => {
    try {
        const uri = process.env.MongoDB_URI;
        if (!uri) throw new Error("MongoDB_URI not found in .env file");

        console.log("Connecting to:", uri.replace(/:([^:@]{1,})@/, ':****@')); // Hide password
        await mongoose.connect(uri);
        console.log("✅ Connected to MongoDB");

        const db = mongoose.connection.db;
        if (!db) throw new Error("DB connection failed");

        const collection = db.collection('carts');

        console.log("⏳ Attempting to drop index: user_1");
        try {
            await collection.dropIndex("user_1");
            console.log("✅ Successfully dropped user_1");
        } catch (e: any) {
            console.log("ℹ️ user_1 index not found or already dropped");
        }

        console.log("⏳ Attempting to drop index: sessionId_1");
        try {
            await collection.dropIndex("sessionId_1");
            console.log("✅ Successfully dropped sessionId_1");
        } catch (e: any) {
            console.log("ℹ️ sessionId_1 index not found or already dropped");
        }

        console.log("\n🚀 All done! Please restart your server now.");
        console.log("The server will recreate the correct sparse indexes on startup.");
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("❌ Error fixing indexes:", error);
        process.exit(1);
    }
};

fixIndexes();
