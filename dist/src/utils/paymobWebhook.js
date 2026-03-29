"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymobWebhook = void 0;
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const Order_1 = require("../models/schema/users/Order");
const Paymob_1 = require("../models/schema/admin/Paymob");
const valueToHmacString = (value) => {
    if (value === null || value === undefined)
        return "";
    if (typeof value === "boolean")
        return value ? "true" : "false";
    return String(value);
};
const buildPaymobTransactionHmacPayload = (obj) => {
    const parts = [
        obj?.amount_cents,
        obj?.created_at,
        obj?.currency,
        obj?.error,
        obj?.has_parent_transaction,
        obj?.id,
        obj?.integration_id,
        obj?.is_3d_secure,
        obj?.is_auth,
        obj?.is_capture,
        obj?.is_refunded,
        obj?.is_standalone_payment,
        obj?.is_voided,
        obj?.order?.id,
        obj?.owner,
        obj?.pending,
        obj?.source_data?.pan,
        obj?.source_data?.sub_type,
        obj?.source_data?.type,
        obj?.success,
    ];
    return parts.map(valueToHmacString).join("");
};
const paymobWebhook = async (req, res) => {
    try {
        const hmacHeader = String(req.query.hmac || req.body?.hmac || "").trim();
        const rawPayload = JSON.stringify(req.body);
        const data = req.body?.obj || req.body;
        const activePaymobConfig = await Paymob_1.PaymobModel.findOne({ isActive: true })
            .sort({ updatedAt: -1 })
            .select("hmac_key")
            .lean();
        const secretKey = process.env.PAYMOB_SECRET_KEY || activePaymobConfig?.hmac_key;
        if (hmacHeader) {
            if (!secretKey) {
                return res.status(500).json({
                    success: false,
                    message: "PAYMOB_SECRET_KEY or active Paymob hmac_key is not configured",
                });
            }
            const generatedFromRawBody = crypto_1.default
                .createHmac("sha512", secretKey)
                .update(rawPayload)
                .digest("hex");
            const generatedFromObjPayload = crypto_1.default
                .createHmac("sha512", secretKey)
                .update(buildPaymobTransactionHmacPayload(data))
                .digest("hex");
            if (generatedFromRawBody !== hmacHeader && generatedFromObjPayload !== hmacHeader) {
                return res.status(400).json({ success: false, message: "Invalid HMAC" });
            }
        }
        const merchantOrderId = String(data?.order?.merchant_order_id || data?.merchant_order_id || "").trim();
        const paymobOrderId = String(data?.order?.id || data?.order || "").trim();
        const isSuccess = data?.success === true;
        let order = null;
        if (merchantOrderId && mongoose_1.default.Types.ObjectId.isValid(merchantOrderId)) {
            order = await Order_1.OrderModel.findById(merchantOrderId);
        }
        if (!order && paymobOrderId) {
            order = await Order_1.OrderModel.findOne({ paymobOrderId });
        }
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found for Paymob callback",
            });
        }
        order.paymentStatus = isSuccess ? "paid" : "failed";
        order.status = isSuccess ? "approved" : "rejected";
        order.paymobTransactionId = data?.id ? String(data.id) : order.paymobTransactionId;
        order.paymobCallbackPayload = data;
        await order.save();
        return res.json({ status: "ok" });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.paymobWebhook = paymobWebhook;
