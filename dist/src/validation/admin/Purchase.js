"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePurchaseSchema = exports.updatePurchaseItemSchema = exports.updatePurchaseItemOptionSchema = exports.createPurchaseSchema = exports.createFinancialSchema = exports.createPurchaseDuePaymentSchema = exports.createPurchaseItemSchema = exports.createPurchaseItemOptionSchema = exports.optionSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.optionSchema = joi_1.default.string(); // مجرد ObjectId
exports.createPurchaseItemOptionSchema = joi_1.default.object({
    option_id: joi_1.default.string().required(),
});
exports.createPurchaseItemSchema = joi_1.default.object({
    date: joi_1.default.date().required(),
    category_id: joi_1.default.string().optional(),
    product_id: joi_1.default.string().optional(),
    product_code: joi_1.default.string().optional(),
    quantity: joi_1.default.number().required(),
    unit_cost: joi_1.default.number().required(),
    discount: joi_1.default.number().required(),
    tax: joi_1.default.number().required(),
    subtotal: joi_1.default.number().required(),
    options: joi_1.default.array().items(exports.createPurchaseItemOptionSchema).optional(),
});
exports.createPurchaseDuePaymentSchema = joi_1.default.object({
    date: joi_1.default.date().required(),
    amount: joi_1.default.number().required(),
});
exports.createFinancialSchema = joi_1.default.object({
    financial_id: joi_1.default.string().required(),
    payment_amount: joi_1.default.number().required(),
});
exports.createPurchaseSchema = joi_1.default.object({
    date: joi_1.default.string().required(),
    warehouse_id: joi_1.default.string().required(),
    supplier_id: joi_1.default.string().required(),
    receipt_img: joi_1.default.string().required(),
    currency_id: joi_1.default.string().required(),
    tax_id: joi_1.default.string().optional(),
    payment_status: joi_1.default.string().valid("pending", "partial", "paid").required(),
    exchange_rate: joi_1.default.number().required(),
    subtotal: joi_1.default.number().required(),
    shiping_cost: joi_1.default.number().required(),
    discount: joi_1.default.number().required(),
    purchase_items: joi_1.default.array().items(exports.createPurchaseItemSchema).required(),
    financials: joi_1.default.array().items(exports.createFinancialSchema).required(),
    purchase_due_payment: joi_1.default.array().items(exports.createPurchaseDuePaymentSchema).required(),
});
// ___________________ Update _________________________
exports.updatePurchaseItemOptionSchema = joi_1.default.object({
    option_id: joi_1.default.string().optional(),
});
exports.updatePurchaseItemSchema = joi_1.default.object({
    date: joi_1.default.date().optional(),
    _id: joi_1.default.string().optional(),
    category_id: joi_1.default.string().optional(),
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
    date: joi_1.default.string().optional(),
    warehouse_id: joi_1.default.string().optional(),
    supplier_id: joi_1.default.string().optional(),
    receipt_img: joi_1.default.string().optional(),
    currency_id: joi_1.default.string().optional(),
    tax_id: joi_1.default.string().optional(),
    exchange_rate: joi_1.default.number().optional(),
    shiping_cost: joi_1.default.number().optional(),
    discount: joi_1.default.number().optional(),
    purchase_items: joi_1.default.array().items(exports.updatePurchaseItemSchema).optional(),
});
