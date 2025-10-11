"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalStockSchema = exports.createStockSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createStockSchema = joi_1.default.object({
    warehouseId: joi_1.default.string().required(),
    type: joi_1.default.string().required(),
    category_id: joi_1.default.array().optional(),
    brand_id: joi_1.default.array().optional(),
});
exports.finalStockSchema = joi_1.default.object({});
