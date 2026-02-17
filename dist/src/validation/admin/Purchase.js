"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePurchaseSchema = exports.updatePurchaseItemSchema = exports.updatePurchaseItemOptionSchema = exports.createPurchaseSchema = exports.createInstallmentSchema = exports.createFinancialSchema = exports.createPurchaseDuePaymentSchema = exports.createPurchaseItemSchema = exports.createPurchaseItemVariationSchema = exports.createPurchaseItemOptionSchema = exports.optionSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.optionSchema = joi_1.default.string(); // مجرد ObjectId
exports.createPurchaseItemOptionSchema = joi_1.default.object({
    product_price_id: joi_1.default.string().optional(),
    option_id: joi_1.default.string().required(),
    quantity: joi_1.default.number().optional()
});
exports.createPurchaseItemVariationSchema = joi_1.default.object({
    product_price_id: joi_1.default.string().optional(),
    quantity: joi_1.default.number().required(),
    options: joi_1.default.array().items(joi_1.default.object({
        option_id: joi_1.default.string().required()
    })).optional(),
});
exports.createPurchaseItemSchema = joi_1.default.object({
    date: joi_1.default.date().required(),
    category_id: joi_1.default.string().optional(),
    product_id: joi_1.default.string().optional(),
    product_code: joi_1.default.string().optional(),
    expiry_date: joi_1.default.date().optional(),
    quantity: joi_1.default.number().required(),
    unit_cost: joi_1.default.number().required(),
    discount: joi_1.default.number().required(),
    tax: joi_1.default.number().required(),
    subtotal: joi_1.default.number().required(),
    patch_number: joi_1.default.string().optional(),
    date_of_expiery: joi_1.default.date().optional(),
    discount_share: joi_1.default.number().optional(),
    unit_cost_after_discount: joi_1.default.number().optional(),
    options: joi_1.default.array().items(exports.createPurchaseItemOptionSchema).optional(),
    variations: joi_1.default.array().items(exports.createPurchaseItemVariationSchema).optional(),
});
exports.createPurchaseDuePaymentSchema = joi_1.default.object({
    date: joi_1.default.date().required(),
    amount: joi_1.default.number().required(),
});
exports.createFinancialSchema = joi_1.default.object({
    financial_id: joi_1.default.string().required(),
    payment_amount: joi_1.default.number().required(),
});
exports.createInstallmentSchema = joi_1.default.object({
    date: joi_1.default.date().required(),
    amount: joi_1.default.number().required(),
});
exports.createPurchaseSchema = joi_1.default.object({
    date: joi_1.default.string().required(),
    warehouse_id: joi_1.default.string().required(),
    supplier_id: joi_1.default.string().required(),
    receipt_img: joi_1.default.string().optional(),
    // currency_id: Joi.string().optional(),
    tax_id: joi_1.default.string().optional(),
    payment_status: joi_1.default.string().valid("partial", "full", "later").required(),
    exchange_rate: joi_1.default.number().required(),
    total: joi_1.default.number().required(),
    shipping_cost: joi_1.default.number().required(),
    grand_total: joi_1.default.number().required(),
    discount: joi_1.default.number().required(),
    note: joi_1.default.string().optional(),
    purchase_items: joi_1.default.array().items(exports.createPurchaseItemSchema).optional(),
    purchase_materials: joi_1.default.array().optional(), // Adding this to allow materials
    financials: joi_1.default.array().items(exports.createFinancialSchema).optional(),
    purchase_due_payment: joi_1.default.array().items(exports.createPurchaseDuePaymentSchema).optional(),
    installments: joi_1.default.array().items(exports.createInstallmentSchema).optional(),
});
// ___________________ Update _________________________
exports.updatePurchaseItemOptionSchema = joi_1.default.object({
    option_id: joi_1.default.string().optional(),
});
exports.updatePurchaseItemSchema = joi_1.default.object({
    date: joi_1.default.date().optional(),
    _id: joi_1.default.string().optional(),
    category_id: joi_1.default.string().optional(),
    expiry_date: joi_1.default.date().optional(),
    product_code: joi_1.default.string().optional(),
    product_id: joi_1.default.string().optional(),
    quantity: joi_1.default.number().optional(),
    unit_cost: joi_1.default.number().optional(),
    discount: joi_1.default.number().optional(),
    tax: joi_1.default.number().optional(),
    subtotal: joi_1.default.number().optional(),
    options: joi_1.default.array().items(exports.updatePurchaseItemOptionSchema).optional(),
});
exports.updatePurchaseSchema = joi_1.default.object({
    date: joi_1.default.string().allow("").optional(),
    warehouse_id: joi_1.default.string().allow("").optional(),
    supplier_id: joi_1.default.string().allow("").optional(),
    receipt_img: joi_1.default.string().allow("").optional(),
    currency_id: joi_1.default.string().allow("").optional(),
    tax_id: joi_1.default.string().allow("").optional(),
    exchange_rate: joi_1.default.number().optional(),
    shiping_cost: joi_1.default.number().optional(),
    discount: joi_1.default.number().optional(),
    purchase_items: joi_1.default.array().items(exports.updatePurchaseItemSchema).optional(),
    installments: joi_1.default.array().optional(),
});
