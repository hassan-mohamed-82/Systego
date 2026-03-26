import { Request, Response } from "express";
import crypto from "crypto";
import { OrderModel } from "../models/schema/users/Order";
import { PaymobModel } from "../models/schema/admin/Paymob";

const toBool = (v: any) => v === true || v === "true";

export const paymobWebhook = async (req: Request, res: Response) => {
    try {
        const payload = req.body?.obj;
        const incomingHmac = String(req.body?.hmac || "").toLowerCase();

        if (!payload) return res.status(400).send("Invalid payload");

        const paymobConfig = await PaymobModel.findOne();
        if (!paymobConfig) return res.status(400).send("No config");

        // 🔐 HMAC
        const dataStr = [
            payload.amount_cents,
            payload.created_at,
            payload.currency,
            payload.error_occured,
            payload.has_parent_transaction,
            payload.id,
            payload.integration_id,
            payload.is_3d_secure,
            payload.is_auth,
            payload.is_capture,
            payload.is_refunded,
            payload.is_standalone_payment,
            payload.is_voided,
            payload.order.id,
            payload.owner,
            payload.pending,
            payload.source_data?.pan,
            payload.source_data?.sub_type,
            payload.source_data?.type,
            payload.success,
        ].join("");

        const expectedHmac = crypto
            .createHmac("sha512", paymobConfig.hmac_key)
            .update(dataStr)
            .digest("hex")
            .toLowerCase();

        if (process.env.NODE_ENV === "production" && expectedHmac !== incomingHmac) {
            return res.status(400).send("Invalid HMAC");
        }

        const merchantOrderId = payload.order.merchant_order_id;

        const order = await OrderModel.findById(merchantOrderId);
        if (!order) return res.status(200).send("Order not found");

        const isSuccess = toBool(payload.success) && !toBool(payload.pending);

        order.paymobTransactionId = String(payload.id);
        order.paymobCallbackPayload = payload;

        if (isSuccess) {
            order.paymentStatus = "paid";
            order.status = "approved";
        } else {
            order.paymentStatus = "failed";
            order.status = "rejected";
        }

        await order.save();

        return res.status(200).send("OK");

    } catch (err) {
        console.error(err);
        return res.status(500).send("Error");
    }
};