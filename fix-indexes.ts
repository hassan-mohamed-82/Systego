import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const nuclearCleanup = async () => {
    try {
        const uri = process.env.MongoDB_URI;
        if (!uri) throw new Error("MongoDB_URI not found");

        await mongoose.connect(uri);
        console.log("✅ Connected to MongoDB");

        const db = mongoose.connection.db;
        if (!db) throw new Error("DB connection failed");

        const collection = db.collection('carts');

        console.log("⏳ Dropping ALL indexes on carts...");
        try {
            await collection.dropIndexes();
            console.log("✅ All indexes dropped");
        } catch (e) {
            console.log("ℹ️ No indexes to drop or collection doesn't exist");
        }

        console.log("⏳ Deleting ALL documents in carts collection...");
        const deleteRes = await collection.deleteMany({});
        console.log(`✅ Deleted ${deleteRes.deletedCount} documents. The collection is now empty.`);

        console.log("\n🚀 System Reset Complete! Please restart your server.");
        console.log("Mongoose will now create fresh, correct indexes on an empty collection.");
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
};

nuclearCleanup();
