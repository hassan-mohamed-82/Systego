import mongoose, { Schema } from "mongoose";
 
const categorySchema =new Schema(
  {
    name: { type: String, required: true, unique: true },
    image: { type: String },
    parentId: { type: Schema.Types.ObjectId, ref: "Category" },
    stock_quantity: { type: Number, default: 0 },
    product_quantity: { type: Number, default: 0 },
  },
  { timestamps: true }
);
 
export const CategoryModel = mongoose.model("Category", categorySchema);