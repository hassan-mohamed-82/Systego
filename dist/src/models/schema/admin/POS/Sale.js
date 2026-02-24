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
// models/Sale.ts
const mongoose_1 = __importStar(require("mongoose"));
const SaleSchema = new mongoose_1.Schema({
    reference: {
        type: String,
        trim: true,
        unique: true,
        maxlength: 8,
        default: function () {
            const now = new Date();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            const day = String(now.getDate()).padStart(2, "0");
            const datePart = `${month}${day}`;
            const randomPart = Math.floor(1000 + Math.random() * 9000);
            return `${datePart}${randomPart}`;
        },
    },
    customer_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Customer",
        required: false,
    },
    // ✅ عميل الدين
    Due_customer_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Customer",
        required: false,
    },
    // ✅ هل فاتورة دين؟
    Due: {
        type: Number,
        enum: [0, 1],
        default: 0,
    },
    // ✅ المبلغ المتبقي
    remaining_amount: {
        type: Number,
        default: 0,
    },
    warehouse_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
    },
    account_id: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "BankAccount" }],
    order_pending: {
        type: Number,
        enum: [0, 1],
        default: 1,
    },
    order_tax: { type: mongoose_1.Schema.Types.ObjectId, ref: "Taxes" },
    order_discount: { type: mongoose_1.Schema.Types.ObjectId, ref: "Discount" },
    grand_total: { type: Number, required: true },
    gift_card_id: { type: mongoose_1.Schema.Types.ObjectId, ref: "GiftCard" },
    coupon_code: { type: String, default: "" },
    applied_coupon: { type: Boolean, default: false },
    cashier_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    shift_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "CashierShift",
        required: true,
    },
    shipping: { type: Number, default: 0 },
    tax_rate: { type: Number, default: 0 },
    tax_amount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paid_amount: { type: Number, default: 0 },
    note: { type: String, default: "" },
    date: { type: Date, default: Date.now },
}, { timestamps: true });
// Index للبحث السريع
SaleSchema.index({ Due: 1, Due_customer_id: 1 });
SaleSchema.index({ Due: 1, remaining_amount: 1 });
const productSalesSchema = new mongoose_1.Schema({
    sale_id: { type: mongoose_1.Schema.Types.ObjectId, ref: "Sale", required: true },
    product_id: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product" },
    bundle_id: { type: mongoose_1.Schema.Types.ObjectId, ref: "Pandel" },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    product_price_id: { type: mongoose_1.Schema.Types.ObjectId, ref: "ProductPrice" },
    isGift: { type: Boolean, default: false },
    isBundle: { type: Boolean, default: false },
    options_id: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Option" }],
}, { timestamps: true });
productSalesSchema.pre("save", function (next) {
    if (!this.product_id && !this.bundle_id) {
        return next(new Error("Either product_id or bundle_id is required"));
    }
    if (this.product_id && this.bundle_id) {
        return next(new Error("Cannot have both product_id and bundle_id"));
    }
    next();
});
exports.SaleModel = mongoose_1.default.model("Sale", SaleSchema);
exports.ProductSalesModel = mongoose_1.default.model("ProductSale", productSalesSchema);
