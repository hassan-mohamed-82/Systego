"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePandelSchema = exports.createPandelSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const productSchema = joi_1.default.object({
    productId: joi_1.default.string().required(),
    productPriceId: joi_1.default.string().allow(null, "").optional(),
    quantity: joi_1.default.number().min(1).default(1),
});
exports.createPandelSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    startdate: joi_1.default.date().required(),
    enddate: joi_1.default.date().required(),
    status: joi_1.default.boolean().default(true),
    images: joi_1.default.array().items(joi_1.default.string()).optional(),
    products: joi_1.default.array().items(productSchema).min(1).required(),
    price: joi_1.default.number().positive().required(),
});
exports.updatePandelSchema = joi_1.default.object({
    name: joi_1.default.string(),
    startdate: joi_1.default.date(),
    enddate: joi_1.default.date(),
    status: joi_1.default.boolean(),
    images: joi_1.default.array().items(joi_1.default.string()),
    products: joi_1.default.array().items(productSchema).min(1),
    price: joi_1.default.number().positive(),
});
