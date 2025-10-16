"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePaymobSchema = exports.createPaymobSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createPaymobSchema = joi_1.default.object({
    type: joi_1.default.string()
        .valid("live", "test")
        .required()
        .messages({
        "string.empty": "Type is required",
        "any.required": "Type is required",
        "any.only": "Type must be either 'live' or 'test'",
    }),
    callback: joi_1.default.string()
        .required()
        .messages({
        "string.empty": "Callback URL is required",
        "any.required": "Callback URL is required",
    }),
    api_key: joi_1.default.string().required().messages({
        "string.empty": "API key is required",
        "any.required": "API key is required",
    }),
    iframe_id: joi_1.default.string().required().messages({
        "string.empty": "Iframe ID is required",
        "any.required": "Iframe ID is required",
    }),
    integration_id: joi_1.default.string().required().messages({
        "string.empty": "Integration ID is required",
        "any.required": "Integration ID is required",
    }),
    hmac_key: joi_1.default.string().required().messages({
        "string.empty": "HMAC key is required",
        "any.required": "HMAC key is required",
    }),
    payment_method_id: joi_1.default.string().required().messages({
        "string.empty": "Payment Method ID is required",
        "any.required": "Payment Method ID is required",
    }),
});
exports.updatePaymobSchema = joi_1.default.object({
    type: joi_1.default.string().valid("live", "test").messages({
        "any.only": "Type must be either 'live' or 'test'",
    }),
    callback: joi_1.default.string().uri().messages({
        "string.uri": "Callback must be a valid URL",
    }),
    api_key: joi_1.default.string(),
    iframe_id: joi_1.default.string(),
    integration_id: joi_1.default.string(),
    hmac_key: joi_1.default.string(),
    payment_method_id: joi_1.default.string(),
});
