import mongoose, { Schema } from "mongoose";


const DiscountSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    status: { type: Boolean, default: true },
    applyIn: { type: String, enum: ["POS", "E-commerce"], default: "E-commerce" },
    },
    { timestamps: true }
);

export const DiscountModel = mongoose.model("Discount", DiscountSchema);