import mongoose from "mongoose";

const revenueSchema = new mongoose.Schema({
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    Category_id: { type: mongoose.Schema.Types.ObjectId, ref: "ExpenseCategory", required: true },
    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String },
    financial_accountId: { type: mongoose.Schema.Types.ObjectId, ref: "BankAccount", required: true }

}, { timestamps: true });

export const RevenueModel = mongoose.model("Revenue", revenueSchema);