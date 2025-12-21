"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductSchema = exports.createProductSchema = exports.priceSchema = exports.optionSchema = exports.objectId = void 0;
const joi_1 = __importDefault(require("joi"));
exports.objectId = joi_1.default.string().hex().length(24);
exports.optionSchema = exports.objectId;
exports.priceSchema = joi_1.default.object({
    _id: exports.objectId.optional(),
    price: joi_1.default.number().required(),
    code: joi_1.default.string().required(),
    start_quantity: joi_1.default.number().optional(),
    cost: joi_1.default.number().optional(),
    quantity: joi_1.default.number().optional(),
    gallery: joi_1.default.array().items(joi_1.default.string()).optional(),
    options: joi_1.default.array().items(exports.optionSchema).optional(),
});
exports.createProductSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    product_unit: exports.objectId.required(),
    sale_unit: exports.objectId.required(),
    purchase_unit: exports.objectId.required(),
    ar_name: joi_1.default.string().required(),
    ar_description: joi_1.default.string().required(),
    image: joi_1.default.string().optional(),
    code: joi_1.default.string(),
    categoryId: joi_1.default.array().items(exports.objectId).min(1).required(),
    brandId: exports.objectId.required(),
    price: joi_1.default.number().required(),
    quantity: joi_1.default.number().optional(),
    description: joi_1.default.string().optional(),
    exp_ability: joi_1.default.boolean().optional(),
    cost: joi_1.default.number().optional(),
    minimum_quantity_sale: joi_1.default.number().optional(),
    low_stock: joi_1.default.number().optional(),
    whole_price: joi_1.default.number().optional(),
    start_quantaty: joi_1.default.number().optional(),
    taxesId: exports.objectId.optional(),
    product_has_imei: joi_1.default.boolean().optional(),
    different_price: joi_1.default.boolean().optional(),
    show_quantity: joi_1.default.boolean().optional(),
    maximum_to_show: joi_1.default.number().optional(),
    gallery_product: joi_1.default.array().items(joi_1.default.string()).optional(),
    prices: joi_1.default.array().items(exports.priceSchema).optional(),
    is_featured: joi_1.default.boolean().optional()
});
exports.updateProductSchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    ar_name: joi_1.default.string().optional(),
    ar_description: joi_1.default.string().optional(),
    image: joi_1.default.string().optional(),
    categoryId: joi_1.default.array().items(exports.objectId).optional(),
    product_unit: exports.objectId.optional(),
    sale_unit: exports.objectId.optional(),
    purchase_unit: exports.objectId.optional(),
    brandId: exports.objectId.optional(),
    price: joi_1.default.number().optional(),
    quantity: joi_1.default.number().optional(),
    description: joi_1.default.string().optional(),
    exp_ability: joi_1.default.boolean().optional(),
    code: joi_1.default.string().optional(),
    cost: joi_1.default.number().optional(),
    minimum_quantity_sale: joi_1.default.number().optional(),
    low_stock: joi_1.default.number().optional(),
    whole_price: joi_1.default.number().optional(),
    start_quantaty: joi_1.default.number().optional(),
    taxesId: exports.objectId.optional(),
    product_has_imei: joi_1.default.boolean().optional(),
    different_price: joi_1.default.boolean().optional(),
    show_quantity: joi_1.default.boolean().optional(),
    maximum_to_show: joi_1.default.number().optional(),
    gallery_product: joi_1.default.array().items(joi_1.default.string()).optional(),
    prices: joi_1.default.array().items(exports.priceSchema).optional(),
    is_featured: joi_1.default.boolean().optional()
});
