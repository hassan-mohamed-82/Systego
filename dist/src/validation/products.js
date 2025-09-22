"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateproductSchema = exports.createproductSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createproductSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    icon: joi_1.default.string().optional(),
    code: joi_1.default.string().required(),
    quantity: joi_1.default.number().required(),
    brand_id: joi_1.default.string().required(),
    category_id: joi_1.default.string().required(),
    unit: joi_1.default.string().valid("piece", "kilogram", "liter", "meter").required(),
    price: joi_1.default.number().required(),
    cost: joi_1.default.number().required(),
    stock_worth: joi_1.default.number().required(),
    exp_date: joi_1.default.date().required(),
    notify_near_expiry: joi_1.default.boolean().required(),
    barcode_number: joi_1.default.string().required(),
    barcode_image: joi_1.default.string().optional(),
});
exports.updateproductSchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    icon: joi_1.default.string().optional(),
    code: joi_1.default.string().optional(),
    quantity: joi_1.default.number().optional(),
    brand_id: joi_1.default.string().optional(),
    category_id: joi_1.default.string().optional(),
    unit: joi_1.default.string().valid("piece", "kilogram", "liter", "meter").optional(),
    price: joi_1.default.number().optional(),
    cost: joi_1.default.number().optional(),
    stock_worth: joi_1.default.number().optional(),
    exp_date: joi_1.default.date().optional(),
    notify_near_expiry: joi_1.default.boolean().optional(),
    barcode_number: joi_1.default.string().optional(),
    barcode_image: joi_1.default.string().optional(),
});
