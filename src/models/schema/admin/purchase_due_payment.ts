import mongoose, { Schema } from "mongoose";

const PurchaseDuePaymentSchema = new Schema(
  {
    purchase_id: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase" },
    amount: { type: Number, required: true },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

export const PurchaseDuePaymentModel = mongoose.model("PurchaseDuePayment", PurchaseDuePaymentSchema);