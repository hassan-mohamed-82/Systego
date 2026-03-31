import mongoose from "mongoose";
import { ORDER_TYPES } from "../../../types/constant";

const orderTypeSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: ORDER_TYPES, 
    },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const OrderTypeModel = mongoose.model("OrderType", orderTypeSchema);