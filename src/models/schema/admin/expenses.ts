import mongoose, { Schema } from "mongoose";

const ExpenseSchema = new Schema(
  {
    date: { type: Date, required: true },
    reference: { type: String, maxlength: 100, trim: true },
    warehouse_id: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    expense_category_id: { type: Schema.Types.ObjectId, ref: "ExpenseCategory", required: true },
    amount: { type: Number, required: true },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

export const ExpenseModel = mongoose.model("Expense", ExpenseSchema);
