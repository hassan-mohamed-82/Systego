"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderModel = void 0;
const mongoose_1 = require("mongoose");
const orderSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    cartItems: [
        {
            product: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: "Product",
            },
            quantity: Number,
            price: Number,
        },
    ],
    shippingAddress: {
        // بدل ما يكون Ref فقط، خزن التفاصيل المهمة
        details: { type: String },
        city: { type: String },
        zone: { type: String }
    },
    shippingPrice: {
        type: Number,
        required: true,
        default: 0
    },
    totalOrderPrice: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "PaymentMethod",
        required: true
    },
    proofImage: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'rejected', 'approved'],
        default: 'pending'
    },
}, {
    timestamps: true
});
exports.OrderModel = (0, mongoose_1.model)('Order', orderSchema);
