"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateServiceFeeSchema = exports.createServiceFeeSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createServiceFeeSchema = joi_1.default.object({
    title: joi_1.default.string().max(200).required(),
    amount: joi_1.default.number().min(0).required(),
    type: joi_1.default.string().valid("fixed", "percentage").required(),
    module: joi_1.default.string().valid("online", "pos").required(),
    warehouseId: joi_1.default.string().hex().length(24).optional().allow(null, ""),
    status: joi_1.default.boolean().optional().default(true),
});
exports.updateServiceFeeSchema = joi_1.default.object({
    title: joi_1.default.string().max(200).optional(),
    amount: joi_1.default.number().min(0).optional(),
    type: joi_1.default.string().valid("fixed", "percentage").optional(),
    module: joi_1.default.string().valid("online", "pos").optional(),
    warehouseId: joi_1.default.string().hex().length(24).optional().allow(null, ""),
    status: joi_1.default.boolean().optional(),
});
