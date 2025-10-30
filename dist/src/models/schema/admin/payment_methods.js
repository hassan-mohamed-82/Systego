"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethodModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const paymetnMethodSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, unique: true },
    ar_name: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    discription: { type: String, required: true },
    icon: { type: String, required: true },
    type: { type: String, required: true, enum: ["manual", "automatic"] },
}, { timestamps: true });
exports.PaymentMethodModel = mongoose_1.default.model('PaymentMethod', paymetnMethodSchema);
