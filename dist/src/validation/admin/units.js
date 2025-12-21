"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUnitSchema = exports.CreateUnitSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.CreateUnitSchema = joi_1.default.object({
    code: joi_1.default.string().required(),
    name: joi_1.default.string().required(),
    ar_name: joi_1.default.string().required(),
    base_unit: joi_1.default.string().optional().allow(null),
    operator: joi_1.default.string().valid("*", "/").default("*"),
    operator_value: joi_1.default.number().min(0).default(1),
    is_base_unit: joi_1.default.boolean().default(false),
    status: joi_1.default.boolean().default(true)
});
exports.UpdateUnitSchema = joi_1.default.object({
    code: joi_1.default.string().optional(),
    name: joi_1.default.string().optional(),
    ar_name: joi_1.default.string().optional(),
    base_unit: joi_1.default.string().optional().allow(null),
    operator: joi_1.default.string().valid("*", "/").optional(),
    operator_value: joi_1.default.number().min(0).optional(),
    is_base_unit: joi_1.default.boolean().optional(),
    status: joi_1.default.boolean().optional()
});
