// models/schema/admin/Paymob.ts
import mongoose from "mongoose";

const PaymobSchema = new mongoose.Schema({
    isActive: { type: Boolean, default: false }, // زرار التفعيل من الداشبورد
    sandboxMode: { type: Boolean, default: true }, // وضع التجربة أو الحقيقي
    api_key: { type: String, required: true },
    iframe_id: { type: String, required: true },
    integration_id: { type: String, required: true },
    hmac_key: { type: String, required: true },
    payment_method_id: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod", required: true },
}, { timestamps: true });

export const PaymobModel = mongoose.model("Paymob", PaymobSchema);