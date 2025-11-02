"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatecountrySchema = exports.createcountrySchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createcountrySchema = joi_1.default.object({
    name: joi_1.default.string().max(100).required(),
    isDefault: joi_1.default.boolean().optional(),
    ar_name: joi_1.default.string().max(100).required(),
});
exports.updatecountrySchema = joi_1.default.object({
    name: joi_1.default.string().max(100).optional(),
    isDefault: joi_1.default.boolean().optional(),
    ar_name: joi_1.default.string().max(100).optional(),
});
