"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateQuantitySchema = exports.addToCartSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.addToCartSchema = joi_1.default.object({
    productId: joi_1.default.string().hex().length(24).required().messages({
        "any.required": "Product ID is required",
    }),
    quantity: joi_1.default.number().min(1).default(1).messages({
        "number.min": "Quantity must be at least 1",
    }),
});
exports.updateQuantitySchema = joi_1.default.object({
    productId: joi_1.default.string().hex().length(24).required(),
    quantity: joi_1.default.number().min(1).required(),
});
