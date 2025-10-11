import mongoose, { Schema } from "mongoose";


const DiscountSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    status: { type: Boolean, default: true },
    },


    { timestamps: true }
);

export const DiscountModel = mongoose.model("Discount", DiscountSchema);