import mongoose, { Schema } from "mongoose";
 
const categorySchema =new Schema(
  {
    name: { type: String, required: true, unique: true },
    image: { type: String },
    parentId: { type: Schema.Types.ObjectId, ref: "Category" },
  },
  { timestamps: true }
);
 
export const CategoryModel = mongoose.model("Category", categorySchema);