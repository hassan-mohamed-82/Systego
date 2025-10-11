import mongoose, { Schema } from "mongoose";


const PaymentSchema = new Schema(
  {
    sale_id: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
    amount: { type: Number, required: true },
    paying_method: {
      type: String,
      required: true,
      enum: ['Cash', 'Credit Card', 'Gift Card'],
    },
    payment_reference: { type: String, required: true, unique: true },
    payment_note: { type: String },
    payment_receiver: { type: String },
    payment_proof: { type: String }
  },
  { timestamps: true }
);

export const PaymentModel = mongoose.model("Payment", PaymentSchema);
