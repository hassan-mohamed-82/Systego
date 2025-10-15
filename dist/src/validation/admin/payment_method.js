"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePaymentMethodSchema = exports.CreatePaymentMethodSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.CreatePaymentMethodSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    discription: joi_1.default.string().required(),
    isActive: joi_1.default.boolean().default(true),
    icon: joi_1.default.string().required(),
    type: joi_1.default.string().required().valid("manual", "automatic")
});
exports.UpdatePaymentMethodSchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    discription: joi_1.default.string().optional(),
    isActive: joi_1.default.boolean().optional(),
    icon: joi_1.default.string().optional(),
    type: joi_1.default.string().optional().valid("manual", "automatic")
});
