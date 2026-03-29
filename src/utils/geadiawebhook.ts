import { Request, Response } from "express";
import { createHmac } from "crypto";
import mongoose from "mongoose";
import { OrderModel } from "../models/schema/users/Order";

const normalize = (value: unknown) => String(value ?? "").trim();

export const geideaWebhook = async (req: Request, res: Response) => {
    try {
        const payload = (req.body || {}) as Record<string, unknown>;
        const incomingSignature = normalize(payload.signature || req.headers["x-signature"]);

        const merchantOrderId = normalize(payload.merchantReferenceId);
        const geideaOrderId = normalize(payload.orderId);
        const status = normalize(payload.status);

        if (!merchantOrderId || !geideaOrderId) {
            return res.status(400).send("Invalid Payload");
        }

        const geideaSecretKey = normalize(
            process.env.GEIDEA_HMAC_KEY || process.env.GEIDEA_SECRET_KEY
        );
        const dataStr = `${normalize(payload.merchantReferenceId)}${normalize(payload.amount)}${normalize(payload.currency)}${normalize(payload.orderId)}${normalize(payload.status)}`;

        const expectedSignature = geideaSecretKey
            ? createHmac("sha256", geideaSecretKey).update(dataStr).digest("hex")
            : "";

        const SKIP_HMAC_FOR_DEBUG = process.env.SKIP_GEIDEA_HMAC === "true";

        if (!SKIP_HMAC_FOR_DEBUG && geideaSecretKey) {
            if (!incomingSignature || expectedSignature.toLowerCase() !== incomingSignature.toLowerCase()) {
                return res.status(400).send("Invalid Signature");
            }
        } else if (!SKIP_HMAC_FOR_DEBUG && !geideaSecretKey) {
            return res.status(500).send("Geidea HMAC key is not configured");
        }

        if (!mongoose.Types.ObjectId.isValid(merchantOrderId)) {
            return res.status(400).send("Invalid merchantReferenceId");
        }

        const order = await OrderModel.findById(merchantOrderId);
        if (!order) {
            return res.status(404).send("Order not found");
        }

        (order as any).geideaTransactionId = geideaOrderId;
        (order as any).geideaCallbackPayload = payload;
        order.markModified("geideaCallbackPayload");

        const detailedStatus = normalize(payload.detailedStatus).toLowerCase();
        const statusLower = status.toLowerCase();
        const paidStatuses = new Set(["success", "paid", "captured", "authorized"]);
        const isPaid = paidStatuses.has(statusLower) || paidStatuses.has(detailedStatus);

        if (isPaid) {
            order.status = "approved";
            order.paymentStatus = "paid";
            await order.save();
            return res.status(200).send("OK");
        }

        const failedStatuses = new Set(["failed", "declined", "cancelled", "canceled", "error"]);
        if (failedStatuses.has(statusLower) || failedStatuses.has(detailedStatus)) {
            order.status = "rejected";
            order.paymentStatus = "failed";
            await order.save();
            return res.status(200).send("OK");
        }

        order.paymentStatus = "pending";
        await order.save();
        return res.status(200).send("OK");
    } catch (error: any) {
        console.error("Geidea Webhook Error:", error);
        return res.status(500).send("Server Error");
    }
};