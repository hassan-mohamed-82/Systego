"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVariationSchema = exports.createVariationSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createVariationSchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(1).max(200).required(),
    options: joi_1.default.array().items(joi_1.default.alternatives().try(joi_1.default.string().trim().min(1).max(200), joi_1.default.object({
        name: joi_1.default.string().trim().min(1).max(200).required(),
        status: joi_1.default.boolean().optional()
    })))
});
exports.updateVariationSchema = joi_1.default.object({
    name: joi_1.default.string().trim().min(1).max(200).optional(),
    options: joi_1.default.array().items(joi_1.default.object({
        _id: joi_1.default.string().optional(), // لو موجود → update
        name: joi_1.default.string().trim().min(1).max(200).required(),
        status: joi_1.default.boolean().optional()
    })).optional()
});
