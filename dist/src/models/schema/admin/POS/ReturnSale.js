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
exports.ReturnModel = void 0;
// models/Return.ts
const mongoose_1 = __importStar(require("mongoose"));
const ReturnItemSchema = new mongoose_1.Schema({
    product_id: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product" },
    product_price_id: { type: mongoose_1.Schema.Types.ObjectId, ref: "ProductPrice" },
    bundle_id: { type: mongoose_1.Schema.Types.ObjectId, ref: "Pandel" },
    original_quantity: { type: Number, required: true },
    returned_quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    reason: { type: String, default: "" },
});
const ReturnSchema = new mongoose_1.Schema({
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
    sale_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Sale",
        required: true,
    },
    sale_reference: {
        type: String,
        required: true,
    },
    customer_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Customer",
    },
    warehouse_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
    },
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
    items: [ReturnItemSchema],
    total_amount: {
        type: Number,
        required: true,
    },
    refund_method: {
        type: String,
        enum: ["cash", "card", "store_credit", "original_method"],
        default: "original_method",
    },
    refund_account_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "BankAccount",
    },
    note: {
        type: String,
        default: "",
    },
    date: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });
ReturnSchema.index({ sale_id: 1 });
ReturnSchema.index({ customer_id: 1 });
ReturnSchema.index({ reference: 1 });
ReturnSchema.index({ sale_reference: 1 });
exports.ReturnModel = mongoose_1.default.model("Return", ReturnSchema);
