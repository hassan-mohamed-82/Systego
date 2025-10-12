"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdjustmentSchema = exports.createAdjustmentSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createAdjustmentSchema = joi_1.default.object({
    warehouse_id: joi_1.default.string().required().messages({
        "any.required": "Warehouse ID is required",
    }),
    note: joi_1.default.string().allow("", null).optional(),
    product_id: joi_1.default.string().optional(),
    quantity: joi_1.default.number().required().messages({
        "any.required": "Quantity is required",
        "number.base": "Quantity must be a number",
        "number.positive": "Quantity must be a positive number",
    }),
    select_reasonId: joi_1.default.string().optional(),
});
exports.updateAdjustmentSchema = joi_1.default.object({
    product_id: joi_1.default.string().optional(),
    quantity: joi_1.default.number().optional(),
    select_reasonId: joi_1.default.string().optional(),
    warehouse_id: joi_1.default.string().optional(),
    note: joi_1.default.string().allow("", null).optional(),
});
