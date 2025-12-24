import mongoose from "mongoose";

const RevenueCategorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        ar_name: {
            type: String,
            required: true,
            unique: true,
        },
        status: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

export const RevenueCategoryModel = mongoose.model("RevenueCategory", RevenueCategorySchema);