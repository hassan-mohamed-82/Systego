"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdjustmentSchema = exports.createAdjustmentSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createAdjustmentSchema = joi_1.default.object({
    date: joi_1.default.date().required().messages({
        "any.required": "Date is required",
    }),
    reference: joi_1.default.string().max(100).optional(),
    warehouse_id: joi_1.default.string().required().messages({
        "any.required": "Warehouse ID is required",
    }),
    note: joi_1.default.string().allow("", null).optional(),
});
exports.updateAdjustmentSchema = joi_1.default.object({
    date: joi_1.default.date().optional(),
    reference: joi_1.default.string().max(100).optional(),
    warehouse_id: joi_1.default.string().optional(),
    note: joi_1.default.string().allow("", null).optional(),
});
