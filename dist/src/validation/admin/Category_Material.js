"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCategoryMaterialSchema = exports.createCategoryMaterialSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createCategoryMaterialSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    ar_name: joi_1.default.string().required(),
    image: joi_1.default.string().optional(),
    parent_category_id: joi_1.default.string().optional(),
    is_active: joi_1.default.boolean().default(true),
});
exports.updateCategoryMaterialSchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    ar_name: joi_1.default.string().optional(),
    image: joi_1.default.string().optional(),
    parent_category_id: joi_1.default.string().optional(),
    is_active: joi_1.default.boolean().optional(),
});
