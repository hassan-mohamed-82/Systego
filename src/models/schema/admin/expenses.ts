import mongoose from "mongoose";
import { CategoryMaterialModel } from "./Category_Material";
const expenseSchema = new mongoose.Schema({
name: { type: String, required: true },
amount: { type: Number, required: true },
Category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
note: { type: String },
financial_accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Financial_Account", required: true }
}, { timestamps: true });

export const ExpenseModel = mongoose.model("Expense", expenseSchema);