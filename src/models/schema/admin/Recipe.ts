import mongoose, { Schema } from "mongoose";

const recipeSchema = new mongoose.Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  material_id: { type: Schema.Types.ObjectId, ref: 'Material', required: true },
  material_quantity: { type: Number, required: true },
  unit: { type: String, enum: ['kg', 'g', 'piece', 'liter', 'meter'], required: true },
}, { timestamps: true });


export const RecipeModel = mongoose.model("Recipe", recipeSchema);


const productionSchema = new mongoose.Schema(
  {
    product_id: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    product_quantity: { type: Number, required: true }, // كام وحدة اتعملت
    materials: [
      {
        material_id: { type: Schema.Types.ObjectId, ref: "Material", required: true },
        material_quantity: { type: Number, required: true }, // الكمية اللي اتخصمت
        unit: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

export const ProductionModel = mongoose.model("Production", productionSchema);
