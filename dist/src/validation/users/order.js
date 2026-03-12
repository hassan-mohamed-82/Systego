"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createOrderSchema = joi_1.default.object({
    shippingAddress: joi_1.default.string().hex().length(24).required().messages({
        "any.required": "Please select a shipping address",
    }),
    paymentMethod: joi_1.default.string().hex().length(24).required().messages({
        "any.required": "Payment method is required",
    }),
    proofImage: joi_1.default.string().optional(),
});
