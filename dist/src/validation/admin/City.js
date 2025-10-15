"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCitySchema = exports.createCitySchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createCitySchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    country: joi_1.default.string().required(),
    shipingCost: joi_1.default.number().min(0).default(0)
});
exports.updateCitySchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    country: joi_1.default.string().optional(),
    shipingCost: joi_1.default.number().min(0).optional()
});
