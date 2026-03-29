"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartModel = void 0;
const mongoose_1 = require("mongoose");
const cartSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Customer',
        required: false,
        index: { unique: true, sparse: true }
    },
    sessionId: {
        type: String,
        required: false,
        index: { unique: true, sparse: true }
    },
    cartItems: [
        {
            product: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
                default: 1
            },
            price: {
                type: Number,
                required: true,
                min: 0
            }
        }
    ],
    totalCartPrice: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});
// Calculate total price before saving
cartSchema.pre('save', function (next) {
    if (this.cartItems) {
        this.totalCartPrice = this.cartItems.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    }
    next();
});
exports.CartModel = (0, mongoose_1.model)('Cart', cartSchema);
