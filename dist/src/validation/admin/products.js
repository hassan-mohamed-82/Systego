"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.createProductSchema = exports.priceSchema = exports.optionSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.optionSchema = joi_1.default.string(); // مجرد ObjectId
exports.priceSchema = joi_1.default.object({
    _id: joi_1.default.string().optional(), // لو موجود نعمل update
    price: joi_1.default.number().required(),
    code: joi_1.default.string().optional(),
    quantity: joi_1.default.number().optional(), // ✅ أضفناها
    gallery: joi_1.default.array().items(joi_1.default.string()).optional(), // ✅ شيلنا .base64()
    options: joi_1.default.array().items(exports.optionSchema).optional(),
});
exports.createProductSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    image: joi_1.default.string().optional(),
    categoryId: joi_1.default.array().items(joi_1.default.string().hex().length(24)).required(),
    brandId: joi_1.default.string().hex().length(24).required(),
    unit: joi_1.default.string().required(),
    price: joi_1.default.number().required(),
    quantity: joi_1.default.number().optional(), // ✅ خليها optional
    description: joi_1.default.string().optional(),
    exp_ability: joi_1.default.boolean().optional(),
    date_of_expiery: joi_1.default.date().optional(),
    minimum_quantity_sale: joi_1.default.number().optional(),
    low_stock: joi_1.default.number().optional(),
    whole_price: joi_1.default.number().optional(),
    start_quantaty: joi_1.default.number().optional(),
    taxesId: joi_1.default.string().hex().length(24).optional(),
    product_has_imei: joi_1.default.boolean().optional(),
    different_price: joi_1.default.boolean().optional(),
    show_quantity: joi_1.default.boolean().optional(),
    maximum_to_show: joi_1.default.number().optional(),
    gallery: joi_1.default.array().items(joi_1.default.string()).optional(), // ✅ أضفناها
    prices: joi_1.default.array().items(exports.priceSchema).required(),
});
exports.updateProductSchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    image: joi_1.default.string().optional(),
    categoryId: joi_1.default.array().items(joi_1.default.string().hex().length(24)).optional(),
    brandId: joi_1.default.string().hex().length(24).optional(),
    unit: joi_1.default.string().optional(),
    price: joi_1.default.number().optional(),
    quantity: joi_1.default.number().optional(),
    description: joi_1.default.string().optional(),
    exp_ability: joi_1.default.boolean().optional(),
    date_of_expiery: joi_1.default.date().optional(),
    minimum_quantity_sale: joi_1.default.number().optional(),
    low_stock: joi_1.default.number().optional(),
    whole_price: joi_1.default.number().optional(),
    start_quantaty: joi_1.default.number().optional(),
    taxesId: joi_1.default.string().hex().length(24).optional(),
    product_has_imei: joi_1.default.boolean().optional(),
    different_price: joi_1.default.boolean().optional(),
    show_quantity: joi_1.default.boolean().optional(),
    maximum_to_show: joi_1.default.number().optional(),
    gallery: joi_1.default.array().items(joi_1.default.string()).optional(), // ✅ أضفناها برضو هنا
    prices: joi_1.default.array().items(exports.priceSchema).optional(),
});
