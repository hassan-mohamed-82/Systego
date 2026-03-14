"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendOtpSchema = exports.verifyOtpSchema = exports.loginSchema = exports.signupSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.signupSchema = joi_1.default.object({
    name: joi_1.default.string().min(3).max(50).required().messages({
        "string.min": "Name must be at least 3 characters long",
        "string.max": "Name cannot exceed 50 characters",
        "any.required": "Name is required",
    }),
    username: joi_1.default.string().min(3).max(50).required(),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required(),
    phone: joi_1.default.string().required(),
});
exports.loginSchema = joi_1.default.object({
    identifier: joi_1.default.string(),
    email: joi_1.default.string().email().messages({
        "string.email": "Invalid email format",
    }),
    password: joi_1.default.string(),
}).or("identifier", "email");
exports.verifyOtpSchema = joi_1.default.object({
    identifier: joi_1.default.string(),
    email: joi_1.default.string().email().messages({
        "string.email": "Invalid email format",
    }),
    otp: joi_1.default.string().length(6).required().messages({
        "string.length": "OTP must be exactly 6 digits",
        "any.required": "OTP is required",
    }),
}).or("identifier", "email");
exports.resendOtpSchema = joi_1.default.object({
    identifier: joi_1.default.string(),
    email: joi_1.default.string().email().messages({
        "string.email": "Invalid email format",
    }),
}).or("identifier", "email");
