"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signupSchema = exports.loginSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string().required().email().messages({
        "string.email": "Invalid email format",
    }),
    password: joi_1.default.string().required().messages({
        "any.required": "Password is required",
    }),
});
exports.signupSchema = joi_1.default.object({
    name: joi_1.default.string().min(3).max(50).required(),
    email: joi_1.default.string().email().required().messages({
        "string.email": "Invalid email format",
    }),
    password: joi_1.default.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long",
    }),
    phone: joi_1.default.string().required().messages({
        "any.required": "Phone number is required",
    }),
    company_name: joi_1.default.string().optional(),
    address: joi_1.default.string().optional(),
    vat_number: joi_1.default.string().optional(),
    state: joi_1.default.string().optional(),
    postal_code: joi_1.default.string().optional(),
    imageBase64: joi_1.default.string().optional(),
});
