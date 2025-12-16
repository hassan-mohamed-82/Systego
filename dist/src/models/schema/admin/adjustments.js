"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdjustmentModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const { Schema } = mongoose_1.default;
const adjustmentSchema = new Schema({
    date: {
        type: Date,
        default: Date.now
    },
    reference: {
        type: String,
        maxlength: 100,
        trim: true,
        default: function () {
            // توليد رقم مرجعي تلقائي مثل: ADJ-20251006-XYZ12
            const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
            const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            return `ADJ-${datePart}-${randomPart}`;
        },
    },
    warehouse_id: {
        type: Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
    },
    note: {
        type: String,
        trim: true,
    },
    productId: [
        {
            type: Schema.Types.ObjectId,
            ref: "Product",
        },
    ],
    quantity: {
        type: Number,
        required: true,
    },
    select_reasonId: {
        type: Schema.Types.ObjectId,
        ref: "SelectReason",
    },
}, { timestamps: true });
exports.AdjustmentModel = mongoose_1.default.model("Adjustment", adjustmentSchema);
