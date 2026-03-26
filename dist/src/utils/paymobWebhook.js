"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymobWebhook = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Order_1 = require("../models/schema/users/Order");
const Paymob_1 = require("../models/schema/admin/Paymob");
const paymobWebhook = async (req, res) => {
    try {
        console.log("Paymob Body:", req.body); // ضيف السطر ده
        const hmacReceived = String(req.query.hmac || "").toLowerCase();
        const payload = req.body;
        if (!payload || !payload.obj) {
            return res.status(400).send("Invalid Payload");
        }
        const obj = payload.obj;
        const merchantOrderId = obj.order.merchant_order_id;
        const integrationId = obj.integration_id;
        // 1. هنجيب الأوردر من الداتابيز
        const order = await Order_1.OrderModel.findById(merchantOrderId);
        if (!order)
            return res.status(200).send("Order not found");
        // 2. حفظ تتبع بسيط للـ webhook (تحديث الحالة لـ pending)
        order.status = "pending";
        order.paymentStatus = "pending";
        order.paymobCallbackPayload = {
            ...(payload.obj || {}),
            debugState: "webhook_received",
        };
        // سطر إجباري لـ Mongoose عشان يحفظ الـ Mixed Object
        order.markModified('paymobCallbackPayload');
        await order.save();
        // 3. ندور على إعدادات بوابة الدفع
        const paymobConfig = await Paymob_1.PaymobModel.findOne({ integration_id: integrationId.toString() });
        if (!paymobConfig) {
            order.status = "rejected";
            order.paymentStatus = "failed";
            order.paymobCallbackPayload.debugState = "config_not_found";
            order.markModified('paymobCallbackPayload');
            await order.save();
            return res.status(200).send("Config not found");
        }
        // 4. تجميع الداتا لحساب الـ HMAC
        const dataStr = [
            obj.amount_cents,
            obj.created_at,
            obj.currency,
            obj.error_occured,
            obj.has_parent_transaction,
            obj.id,
            obj.integration_id,
            obj.is_3d_secure,
            obj.is_auth,
            obj.is_capture,
            obj.is_refunded,
            obj.is_standalone_payment,
            obj.is_voided,
            obj.order.id,
            obj.owner,
            obj.pending,
            obj.source_data?.pan,
            obj.source_data?.sub_type,
            obj.source_data?.type,
            obj.success,
        ].join('');
        const hashedStr = crypto_1.default
            .createHmac("sha512", paymobConfig.hmac_key)
            .update(dataStr)
            .digest("hex");
        // 5. مقارنة الـ HMAC
        if (hashedStr.toLowerCase() !== hmacReceived) {
            order.status = "rejected";
            order.paymentStatus = "failed";
            order.paymobCallbackPayload.debugState = "hmac_failed";
            order.markModified('paymobCallbackPayload');
            await order.save();
            return res.status(400).send("HMAC Validation Failed");
        }
        // 6. كل حاجة تمام، نغير الحالة للنجاح أو الفشل بناءً على رد البنك
        if (obj.success === true && obj.pending === false) {
            order.status = "approved";
            order.paymentStatus = "paid";
        }
        else {
            order.status = "rejected";
            order.paymentStatus = "failed";
        }
        // تحديث باقي الحقول المطلوبة في الـ Schema
        order.paymobTransactionId = String(obj.id || "");
        order.paymobCallbackPayload = {
            ...(payload.obj || {}),
            debugState: "completed",
        };
        order.markModified('paymobCallbackPayload');
        await order.save();
        return res.status(200).send("OK");
    }
    catch (error) {
        console.error("Webhook Error:", error);
        return res.status(500).send("Server Error");
    }
};
exports.paymobWebhook = paymobWebhook;
