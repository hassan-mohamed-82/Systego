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
exports.PurchaseModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PurchaseSchema = new mongoose_1.Schema({
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
    date: { type: Date, required: true, default: Date.now },
    warehouse_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Warehouse" },
    supplier_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Supplier" },
    tax_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Taxes" },
    receipt_img: { type: String },
    payment_status: {
        type: String,
        enum: ["partial", "full", "later"],
    },
    exchange_rate: { type: Number, required: true, default: 1 },
    total: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    shipping_cost: { type: Number, default: 0 },
    grand_total: { type: Number, required: true },
    note: { type: String },
}, { timestamps: true });
PurchaseSchema.virtual("items", {
    ref: "PurchaseItem",
    localField: "_id",
    foreignField: "purchase_id",
});
PurchaseSchema.virtual("invoices", {
    ref: "PurchaseInvoice",
    localField: "_id",
    foreignField: "purchase_id",
});
PurchaseSchema.virtual("installments", {
    ref: "PurchaseInstallment",
    localField: "_id",
    foreignField: "purchase_id",
});
PurchaseSchema.virtual("duePayments", {
    ref: "PurchaseDuePayment",
    localField: "_id",
    foreignField: "purchase_id",
});
PurchaseSchema.set("toObject", { virtuals: true });
PurchaseSchema.set("toJSON", { virtuals: true });
exports.PurchaseModel = mongoose_1.default.model("Purchase", PurchaseSchema);
