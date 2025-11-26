import mongoose, { Schema } from "mongoose";

const categoryMaterialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ar_name: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  parent_category_id: { type: Schema.Types.ObjectId, ref: 'CategoryMaterial', default: null },
  image: { type: String },

}, { timestamps: true });

export const CategoryMaterialModel = mongoose.model("CategoryMaterial", categoryMaterialSchema);