"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.editProfileSchema = exports.completeProfileSchema = exports.resendOtpSchema = exports.verifyOtpSchema = exports.loginSchema = exports.signupSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.signupSchema = joi_1.default.object({
    username: joi_1.default.string().min(3).max(50).required().messages({
        "string.min": "Name must be at least 3 characters long",
        "string.max": "Name cannot exceed 50 characters",
        "any.required": "Name is required",
    }),
    email: joi_1.default.string().email().required().messages({
        "string.email": "Invalid email format",
        "any.required": "Email is required",
    }),
    password: joi_1.default.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long",
        "any.required": "Password is required",
    }),
    phone: joi_1.default.string().required().messages({
        "any.required": "Phone number is required",
    }),
    image: joi_1.default.string().allow(null, ""), // Base64 string
});
exports.loginSchema = joi_1.default.object({
    identifier: joi_1.default.string().required().messages({
        "any.required": "Email, Phone, or Username is required",
    }),
    password: joi_1.default.string().allow(""), // Allowed empty for POS users triggering OTP
});
exports.verifyOtpSchema = joi_1.default.object({
    identifier: joi_1.default.string().required(),
    otp: joi_1.default.string().length(6).required().messages({
        "string.length": "OTP must be exactly 6 digits",
        "any.required": "OTP is required",
    }),
});
exports.resendOtpSchema = joi_1.default.object({
    identifier: joi_1.default.string().required(),
});
// For POS users completing their profile
exports.completeProfileSchema = joi_1.default.object({
    userId: joi_1.default.string().required(),
    username: joi_1.default.string().min(3).max(50).required(),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required(),
    confirmPassword: joi_1.default.string().valid(joi_1.default.ref("password")).required().messages({
        "any.only": "Passwords do not match",
    }),
    image: joi_1.default.string().allow(null, ""),
});
exports.editProfileSchema = joi_1.default.object({
    username: joi_1.default.string().min(3).max(50),
    email: joi_1.default.string().email(),
    phone: joi_1.default.string(),
    password: joi_1.default.string().min(6),
    image: joi_1.default.string().allow(null, ""),
});
