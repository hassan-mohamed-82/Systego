"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.createProductSchema = exports.priceSchema = exports.optionSchema = exports.objectId = void 0;
const joi_1 = __importDefault(require("joi"));
// ✅ تعريف ObjectId
exports.objectId = joi_1.default.string().hex().length(24);
// ✅ Option Schema (مجرد ID)
exports.optionSchema = exports.objectId;
// ✅ Price Schema (يتبع ProductPriceModel)
exports.priceSchema = joi_1.default.object({
    _id: exports.objectId.optional(),
    price: joi_1.default.number().required(),
    code: joi_1.default.string().required(),
    quantity: joi_1.default.number().optional(),
    gallery: joi_1.default.array().items(joi_1.default.string()).optional(), // ✅ أزلنا pattern
    options: joi_1.default.array().items(exports.optionSchema).optional(),
});
// ✅ Create Product Schema
exports.createProductSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    image: joi_1.default.string().optional(), // ✅ أزلنا pattern
    categoryId: joi_1.default.array().items(exports.objectId).min(1).required(),
    brandId: exports.objectId.required(),
    unit: joi_1.default.string().required(),
    price: joi_1.default.number().required(),
    quantity: joi_1.default.number().optional(),
    description: joi_1.default.string().optional(),
    exp_ability: joi_1.default.boolean().optional(),
    date_of_expiery: joi_1.default.date().optional(),
    minimum_quantity_sale: joi_1.default.number().optional(),
    low_stock: joi_1.default.number().optional(),
    whole_price: joi_1.default.number().optional(),
    start_quantaty: joi_1.default.number().optional(),
    taxesId: exports.objectId.optional(),
    product_has_imei: joi_1.default.boolean().optional(),
    different_price: joi_1.default.boolean().optional(),
    show_quantity: joi_1.default.boolean().optional(),
    maximum_to_show: joi_1.default.number().optional(),
    gallery_product: joi_1.default.array().items(joi_1.default.string()).optional(), // ✅ أزلنا pattern
    prices: joi_1.default.array().items(exports.priceSchema).required(),
});
// ✅ Update Product Schema
exports.updateProductSchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    image: joi_1.default.string().optional(), // ✅ أزلنا pattern
    categoryId: joi_1.default.array().items(exports.objectId).optional(),
    brandId: exports.objectId.optional(),
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
    taxesId: exports.objectId.optional(),
    product_has_imei: joi_1.default.boolean().optional(),
    different_price: joi_1.default.boolean().optional(),
    show_quantity: joi_1.default.boolean().optional(),
    maximum_to_show: joi_1.default.number().optional(),
    gallery_product: joi_1.default.array().items(joi_1.default.string()).optional(), // ✅ أزلنا pattern
    prices: joi_1.default.array().items(exports.priceSchema).optional(),
});
