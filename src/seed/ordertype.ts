import mongoose from "mongoose";
import { OrderTypeModel } from "../models/schema/admin/ordertype";
import { ORDER_TYPES } from "../types/constant";

export const seedOrderTypes = async () => {
    try {
        for (const type of ORDER_TYPES) {
            await OrderTypeModel.findOneAndUpdate(
                { type },
                { $setOnInsert: { type, isActive: true } },
                { upsert: true, new: true }
            );
        }
        console.log("✅ Order Types checked/seeded");
    } catch (err) {
        console.error("❌ Seed failed:", err);
    }
};