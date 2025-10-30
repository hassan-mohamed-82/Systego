"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTaxesSchema = exports.createTaxesSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createTaxesSchema = joi_1.default.object({
    name: joi_1.default.string().max(100).required(),
    ar_name: joi_1.default.string().max(100).required(),
    status: joi_1.default.boolean().optional().default(true),
    amount: joi_1.default.number().min(0).required(),
    type: joi_1.default.string().valid("percentage", "fixed").required(),
});
exports.updateTaxesSchema = joi_1.default.object({
    name: joi_1.default.string().max(100).optional(),
    ar_name: joi_1.default.string().max(100).optional(),
    status: joi_1.default.boolean().optional(),
    amount: joi_1.default.number().min(0).optional(),
    type: joi_1.default.string().valid("percentage", "fixed").optional(),
});
