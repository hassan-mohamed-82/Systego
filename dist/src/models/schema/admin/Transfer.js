"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const TransferSchema = new mongoose_1.default.Schema({
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
    date: { type: Date, default: Date.now },
    fromWarehouseId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true
    },
    toWarehouseId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true
    },
    products: [
        {
            productId: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: "Product",
                required: true
            },
            productPriceId: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: "ProductPrice",
                default: null,
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            }
        }
    ],
    // ✅ عدلت الـ reason يكون اختياري
    rejected_products: [
        {
            productId: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: "Product",
                required: true
            },
            productPriceId: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: "ProductPrice",
                default: null
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            reason: {
                type: String,
                default: "No reason provided", // ✅ التغيير هنا
            },
        }
    ],
    approved_products: [
        {
            productId: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: "Product",
                required: true
            },
            productPriceId: {
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: "ProductPrice",
                default: null
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
        }
    ],
    status: {
        type: String,
        enum: ["pending", "received", "rejected"],
        default: "pending"
    },
    reason: {
        type: String,
        default: "" // ✅ عدلت من required: true لـ default
    },
});
TransferSchema.pre("save", async function (next) {
    if (!this.reference) {
        const count = await mongoose_1.default.model("Transfer").countDocuments();
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        this.reference = `TRF-${date}-${count + 1}`;
    }
    next();
});
exports.TransferModel = mongoose_1.default.model("Transfer", TransferSchema);
