import mongoose, { Schema } from "mongoose";

const recipeSchema = new mongoose.Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  material_id: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, enum: ['kg', 'g', 'piece', 'liter', 'meter'], required: true },
}, { timestamps: true });


export const RecipeModel = mongoose.model("Recipe", recipeSchema);