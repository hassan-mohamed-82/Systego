"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const PurchaseSchema = new mongoose_1.Schema({
    date: { type: Date, required: true, default: Date.now },
    reference_no: { type: String, required: true, unique: true },
    warehouse_id: { type: Number, required: true },
    supplier_id: { type: Number, required: true },
    receipt_img: { type: String },
    currency_id: { type: Number, required: true },
    payment_status: {
        type: String,
        enum: ["pending", "partial", "paid"],
        default: "pending",
    },
    financial_account_id: { type: Number, required: true },
    exchange_rate: { type: Number, required: true, default: 1 },
    product_id: { type: Number, required: true },
    quantity: { type: Number, required: true },
    unit_cost: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    subtotal: { type: Number, required: true }
}, { timestamps: true });
