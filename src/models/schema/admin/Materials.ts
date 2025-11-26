import mongoose, { Schema } from "mongoose";

const materialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ar_name: { type: String, required: true },
  photo: { type: String },
  description: { type: String },
  ar_description: { type: String },
  category_id: { type: Schema.Types.ObjectId, ref: 'CategoryMaterial', required: true },
  quantity: { type: Number, default: 0 },
  expired_ability: { type: Boolean, default: false },
  date_of_expiry: { type: Date },
  low_stock: { type: Number, default: 0 },
  unit: { type: String, enum: ['kg', 'g', 'piece', 'liter', 'meter'], required: true },
}, { timestamps: true });

export const MaterialModel = mongoose.model("Material", materialSchema);
