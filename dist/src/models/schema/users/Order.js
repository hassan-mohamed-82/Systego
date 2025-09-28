"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
const mongoose_1 = require("mongoose");
const orderSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'platform_user',
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
    totalPrice: {
        type: Number,
    },
    shippingAddress: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Address'
    },
    paymentMethod: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "PaymentMethod",
        required: true
    },
    proofImage: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'rejected', 'approved'],
        default: 'pending'
    },
}, {
    timestamps: true
});
exports.Order = (0, mongoose_1.model)('Order', orderSchema);
