import mongoose, { Schema } from "mongoose";

const PaymentSchema = new Schema(
  {
    sale_id: { type: Schema.Types.ObjectId, ref: "Sale", required: true },

    // ✅ account_id كـ Array of BankAccount IDs
    account_id: [
      { type: Schema.Types.ObjectId, ref: "BankAccount", required: true }
    ],

    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "completed",
    },
    payment_proof: { type: String },
  },
  { timestamps: true }
);

export const PaymentModel = mongoose.model("Payment", PaymentSchema);
