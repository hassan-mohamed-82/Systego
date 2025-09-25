import mongoose, { Schema } from "mongoose";

const CouponSchema = new Schema(
  {
    
    coupon_code: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
    type: { type: String, enum: ["percentage", "flat"], required: true },
    amount: { type: Number, required: true },
    minimum_amount: { type: Number, default: 0 },
    quantity: { type: Number, required: true },
    available: { type: Number, required: true },
    expired_date: { type: Date, required: true },
  },
  { timestamps: true }
);

export const CouponModel = mongoose.model("Coupon", CouponSchema);
