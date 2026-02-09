import mongoose from "mongoose";

const TaxesSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    ar_name: { type: String, required: true, unique: true },
    status: { type: Boolean, default: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["percentage", "fixed"], required: true },
  },
  { timestamps: true }
);
export const TaxesModel = mongoose.model("Taxes", TaxesSchema);