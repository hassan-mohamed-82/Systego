"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeideaModel = void 0;
const mongoose_1 = require("mongoose");
const geideaSchema = new mongoose_1.Schema({
    payment_method_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "PaymentMethod", // ربطناه بطرق الدفع زي ما عملنا في Paymob
        required: true
    },
    publicKey: {
        type: String,
        required: true,
        trim: true
    },
    apiPassword: {
        type: String,
        required: true,
        trim: true
    },
    merchantId: {
        type: String,
        required: true,
        trim: true
    },
    webhookSecret: {
        type: String,
        required: true,
        trim: true // ده اللي هنفك بيه التشفير (Signature) في الـ Callback
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});
exports.GeideaModel = (0, mongoose_1.model)('Geidea', geideaSchema);
