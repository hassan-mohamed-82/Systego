"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBookingSchema = exports.createBookingSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createBookingSchema = joi_1.default.object({
    number_of_days: joi_1.default.number()
        .integer()
        .min(1)
        .required()
        .messages({
        "number.base": "Number of days must be a number",
        "number.min": "Number of days must be at least 1",
        "any.required": "Number of days is required",
    }),
    deposit: joi_1.default.number()
        .min(0)
        .required()
        .messages({
        "number.base": "Deposit must be a number",
        "any.required": "Deposit is required",
    }),
    CustmerId: joi_1.default.string()
        .required()
        .messages({
        "any.required": "Customer ID is required",
    }),
    WarehouseId: joi_1.default.string()
        .required()
        .messages({
        "any.required": "Warehouse ID is required",
    }),
    ProductId: joi_1.default.array()
        .required()
        .messages({
        "array.base": "Product list must be an array",
    }),
    CategoryId: joi_1.default.array()
        .required()
        .messages({
        "array.base": "Category list must be an array",
    }),
    status: joi_1.default.string()
        .valid("pending", "pay", "failer")
        .default("pending")
        .messages({
        "any.only": "Status must be one of: pending, pay, or failer",
    }),
});
exports.updateBookingSchema = joi_1.default.object({
    number_of_days: joi_1.default.number()
        .integer()
        .min(1)
        .messages({
        "number.base": "Number of days must be a number",
        "number.min": "Number of days must be at least 1",
    }),
    deposit: joi_1.default.number()
        .min(0)
        .messages({
        "number.base": "Deposit must be a number",
    }),
    CustmerId: joi_1.default.string()
        .messages({
        "any.required": "Customer is required",
    }),
    WarehouseId: joi_1.default.string().messages({
        "any.required": "Warehouse ID is required",
    }),
    ProductId: joi_1.default.string().messages({
        "any.required": "Product ID is required",
    }),
    CategoryId: joi_1.default.string().messages({
        "any.required": "Category ID is required",
    }),
    status: joi_1.default.string()
        .valid("pending", "pay", "failer")
        .messages({
        "any.only": "Status must be one of: pending, pay, or failer",
    }),
});
