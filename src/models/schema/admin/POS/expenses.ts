import mongoose from "mongoose";
const expenseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  Category_id: { type: mongoose.Schema.Types.ObjectId, ref: "ExpenseCategory", required: true },
  shift_id: { type: mongoose.Schema.Types.ObjectId, ref: "CashierShift", required: false },
  cashier_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  note: { type: String },
  financial_accountId: { type: mongoose.Schema.Types.ObjectId, ref: "BankAccount", required: true }
}, { timestamps: true });

export const ExpenseModel = mongoose.model("Expense", expenseSchema);