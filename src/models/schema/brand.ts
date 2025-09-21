import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        logo: { type: String },
    },
    { timestamps: true }
);

export const BrandModel = mongoose.model("Brand", brandSchema);