import mongoose, { Schema } from "mongoose";
 
const categorySchema =new Schema(
  {
    name: { type: String, required: true },
    image: { type: String },
    parentId: { type: Schema.Types.ObjectId, ref: "Category" },
    number_of_products: { type: Number, default: 0 },
    stock_quantity: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
  },
  { timestamps: true }
);
 
export const CategoryModel = mongoose.model("Category", categorySchema);