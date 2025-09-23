"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateExpenseSchema = exports.createExpenseSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createExpenseSchema = joi_1.default.object({
    date: joi_1.default.date().required().messages({
        "any.required": "Expense date is required",
    }),
    reference: joi_1.default.string().max(100).allow(null, ""),
    warehouse_id: joi_1.default.string().hex().length(24).required().messages({
        "any.required": "Warehouse ID is required",
    }),
    expense_category_id: joi_1.default.string().hex().length(24).required().messages({
        "any.required": "Expense category is required",
    }),
    amount: joi_1.default.number().positive().precision(2).required().messages({
        "any.required": "Amount is required",
        "number.positive": "Amount must be greater than 0",
    }),
    note: joi_1.default.string().allow(null, ""),
});
exports.updateExpenseSchema = joi_1.default.object({
    date: joi_1.default.date().optional().messages({
        "any.required": "Expense date is required",
    }),
    reference: joi_1.default.string().max(100).allow(null, ""),
    warehouse_id: joi_1.default.string().hex().length(24).optional().messages({
        "any.required": "Warehouse ID is required",
    }),
    expense_category_id: joi_1.default.string().hex().length(24).optional().messages({
        "any.required": "Expense category is required",
    }),
    amount: joi_1.default.number().positive().precision(2).optional().messages({
        "any.required": "Amount is required",
        "number.positive": "Amount must be greater than 0",
    }),
    note: joi_1.default.string().allow(null, ""),
});
