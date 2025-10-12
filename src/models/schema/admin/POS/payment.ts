import mongoose, { Schema } from "mongoose";


const PaymentSchema = new Schema(
  {
    sale_id: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
    amount: { type: Number, required: true },
    payment_method: { type: Schema.Types.ObjectId, ref: 'PaymentMethod', required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    payment_proof: { type: String }
  },
  { timestamps: true }
);

export const PaymentModel = mongoose.model("Payment", PaymentSchema);
