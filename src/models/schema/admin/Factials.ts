import mongoose, { Schema } from "mongoose";

const factialsSchema = new mongoose.Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  materials: [
    {
      material_id: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
      quantity: { type: Number, required: true },
    }
  ],
  amount_of_product: { type: Number, required: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

export const FactialsModel = mongoose.model("Factials", factialsSchema);