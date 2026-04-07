"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBannerSchema = exports.createBannerSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const constant_1 = require("../../types/constant");
const validPages = [...constant_1.BANNER_PAGES];
exports.createBannerSchema = joi_1.default.object({
    name: joi_1.default.array().items(joi_1.default.string().valid(...validPages)).min(1).required(),
    title: joi_1.default.string().optional(),
    description: joi_1.default.string().optional(),
    images: joi_1.default.array().items(joi_1.default.string()).min(1).required(),
    isActive: joi_1.default.boolean().optional(),
});
exports.updateBannerSchema = joi_1.default.object({
    name: joi_1.default.array().items(joi_1.default.string().valid(...validPages)).min(1).optional(),
    title: joi_1.default.string().optional(),
    description: joi_1.default.string().optional(),
    images: joi_1.default.array().items(joi_1.default.string()).optional(),
    isActive: joi_1.default.boolean().optional(),
});
