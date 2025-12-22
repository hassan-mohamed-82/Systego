"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCategorySchema = exports.createCategorySchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createCategorySchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    ar_name: joi_1.default.string().required(),
    image: joi_1.default.string().optional().allow("", null),
    parentId: joi_1.default.string().optional().allow("", null),
});
exports.updateCategorySchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    ar_name: joi_1.default.string().optional(),
    image: joi_1.default.string().optional().allow("", null),
    parentId: joi_1.default.string().optional().allow("", null),
});
