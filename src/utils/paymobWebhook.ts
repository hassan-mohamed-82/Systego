// controllers/webhooks/paymobWebhook.ts
import { Request, Response } from "express";
import crypto from "crypto";
import { OrderModel } from "../models/schema/users/Order";
import { PaymobModel } from "../models/schema/admin/Paymob";

export const paymobWebhook = async (req: Request, res: Response) => {
    try {
        const hmacReceived = req.query.hmac as string;
        const payload = req.body;

        if (!payload || !payload.obj) {
            return res.status(400).send("Invalid Payload");
        }

        const obj = payload.obj;
        const merchantOrderId = obj.order.merchant_order_id; // ده الـ ID بتاعك
        const integrationId = obj.integration_id;

        // 1. بما إننا شغالين Dynamic، لازم نجيب الـ HMAC Key الخاص بالعميل ده من الداتابيز
        // هنجيبه عن طريق الـ integration_id اللي راجع في الريكويست
        const paymobConfig = await PaymobModel.findOne({ integration_id: integrationId.toString() });
        
        if (!paymobConfig) {
            console.error("Paymob Webhook: No config found for this integration_id");
            return res.status(200).send("Config not found"); // بنرجع 200 عشان Paymob تبطل تبعت
        }

        // 2. التحقق من الـ HMAC (طريقة Paymob في ترتيب المتغيرات ثابتة)
        // لازم ترتبهم أبجدياً وتدمجهم في String واحد
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
            obj.source_data.pan,
            obj.source_data.sub_type,
            obj.source_data.type,
            obj.success,
        ].join('');

        // التشفير باستخدام الـ HMAC Key الخاص بالعميل من الداتابيز
        const hashedStr = crypto
            .createHmac("sha512", paymobConfig.hmac_key)
            .update(dataStr)
            .digest("hex");

        // لو الـ HMAC مش متطابق، ده معناه إن فيه تلاعب في البيانات
        if (hashedStr !== hmacReceived) {
            console.error("Paymob Webhook: HMAC validation failed!");
            return res.status(400).send("HMAC Validation Failed");
        }

        // 3. تحديث حالة الأوردر في الداتابيز
        const order = await OrderModel.findById(merchantOrderId);
        if (!order) return res.status(200).send("Order not found");

        if (obj.success === true && obj.pending === false) {
            order.status = "approved";
            order.paymentStatus = "paid";
        } else {
            order.status = "rejected";
            order.paymentStatus = "failed";
        }

        await order.save();

        // مهم جداً ترجع 200 لـ Paymob 
        return res.status(200).send("OK");

    } catch (error) {
        console.error("Webhook Error:", error);
        return res.status(500).send("Server Error");
    }
};