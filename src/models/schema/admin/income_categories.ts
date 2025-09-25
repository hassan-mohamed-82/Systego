import mongoose, { Schema } from "mongoose";

const incomecategoriesSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

export const IncomeCategoriesModel = mongoose.model(
  "incomecategories",
  incomecategoriesSchema
);
