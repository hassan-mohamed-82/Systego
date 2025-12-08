"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const expenseSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    Category_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Category", required: true },
    shift_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "CashierShift", required: true },
    cashier_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true },
    note: { type: String },
    financial_accountId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "BankAccount", required: true }
}, { timestamps: true });
exports.ExpenseModel = mongoose_1.default.model("Expense", expenseSchema);
