"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCategorySchema = exports.createCategorySchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createCategorySchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    number_of_products: joi_1.default.number().optional(),
    image: joi_1.default.string().optional(),
    parentId: joi_1.default.string().optional(),
});
exports.updateCategorySchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    number_of_products: joi_1.default.number().optional(),
    image: joi_1.default.string().optional(),
    parentId: joi_1.default.string().optional(),
});
