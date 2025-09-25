import mongoose, { Schema } from "mongoose";

const ExpenseCategorySchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

export const ExpenseCategoryModel = mongoose.model(
  "ExpenseCategory",
  ExpenseCategorySchema
);
