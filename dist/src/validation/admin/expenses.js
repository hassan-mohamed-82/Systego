"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateExpenseSchema = exports.createExpenseSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createExpenseSchema = joi_1.default.object({
    name: joi_1.default.string().max(100).required().messages({
        "any.required": "Expense name is required",
    }),
    amount: joi_1.default.number().positive().precision(2).required().messages({
        "any.required": "Amount is required",
        "number.positive": "Amount must be greater than 0",
    }),
    Category_id: joi_1.default.string().hex().length(24).required().messages({
        "any.required": "Category ID is required",
    }),
    note: joi_1.default.string().allow(null, ""),
    financial_accountId: joi_1.default.string().hex().length(24).required().messages({
        "any.required": "Financial Account ID is required",
    }),
});
exports.updateExpenseSchema = joi_1.default.object({
    name: joi_1.default.string().max(100).messages({
        "string.max": "Expense name must be at most 100 characters",
    }),
    amount: joi_1.default.number().positive().precision(2).messages({
        "number.positive": "Amount must be greater than 0",
    }),
    Category_id: joi_1.default.string().hex().length(24).messages({
        "string.length": "Category ID must be a valid 24-character hex string",
    }),
    note: joi_1.default.string().allow(null, ""),
    financial_accountId: joi_1.default.string().hex().length(24).messages({
        "string.length": "Financial Account ID must be a valid 24-character hex string",
    }),
});
