"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductSalesModel = exports.SaleModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const SaleSchema = new mongoose_1.Schema({
    reference: {
        type: String,
        maxlength: 100,
        trim: true,
        default: function () {
            const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
            const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            return `SALE-${datePart}-${randomPart}`;
        },
    },
    customer_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer', required: true },
    warehouse_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    // currency_id: { type: Schema.Types.ObjectId, ref: 'Currency' },
    account_id: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'BankAccount' }],
    payment_method: { type: mongoose_1.Schema.Types.ObjectId, ref: 'PaymentMethod', required: true },
    order_pending: { type: Number, enum: [0, 1], default: 0 }, // 0: pending, 1: completed, 2: partial
    order_tax: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Taxes' },
    order_discount: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Discount' },
    // shipping_cost: { type: Number, default: 0 },
    grand_total: { type: Number, required: true },
    coupon_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Coupon' },
    gift_card_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'GiftCard' }
}, { timestamps: true });
const productSalesSchema = new mongoose_1.Schema({
    sale_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Sale', required: true },
    product_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' }, // ✅ مش required عشان الـ Bundle
    bundle_id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Pandel' }, // ✅ جديد
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    options_id: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Option' }],
    isGift: { type: Boolean, default: false },
    isBundle: { type: Boolean, default: false }, // ✅ جديد
}, { timestamps: true });
// ✅ Validation: لازم يكون فيه product_id أو bundle_id
productSalesSchema.pre('save', function (next) {
    if (!this.product_id && !this.bundle_id) {
        return next(new Error('Either product_id or bundle_id is required'));
    }
    if (this.product_id && this.bundle_id) {
        return next(new Error('Cannot have both product_id and bundle_id'));
    }
    next();
});
exports.SaleModel = mongoose_1.default.model("Sale", SaleSchema);
exports.ProductSalesModel = mongoose_1.default.model("ProductSale", productSalesSchema);
