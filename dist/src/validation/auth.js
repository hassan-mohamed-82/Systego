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
    username: joi_1.default.string().min(3).max(50).required().messages({
        "string.min": "Username must be at least 3 characters long",
        "string.max": "Username cannot exceed 50 characters",
        "any.required": "Username is required",
    }),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required(),
    phone: joi_1.default.string().required(),
    company_name: joi_1.default.string().optional(),
    address: joi_1.default.string().optional(),
    vat_number: joi_1.default.string().optional(),
    state: joi_1.default.string().optional(),
    postal_code: joi_1.default.string().optional(),
    imageBase64: joi_1.default.string().optional(),
    image_url: joi_1.default.string().optional(),
    role: joi_1.default.string().valid("superadmin", "admin").optional(),
});
