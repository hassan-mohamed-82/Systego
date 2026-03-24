"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymobModel = void 0;
// models/schema/admin/Paymob.ts
const mongoose_1 = __importDefault(require("mongoose"));
const PaymobSchema = new mongoose_1.default.Schema({
    isActive: { type: Boolean, default: false }, // زرار التفعيل من الداشبورد
    sandboxMode: { type: Boolean, default: true }, // وضع التجربة أو الحقيقي
    api_key: { type: String, required: true },
    iframe_id: { type: String, required: true },
    integration_id: { type: String, required: true },
    hmac_key: { type: String, required: true },
    payment_method_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "PaymentMethod", required: true },
}, { timestamps: true });
exports.PaymobModel = mongoose_1.default.model("Paymob", PaymobSchema);
