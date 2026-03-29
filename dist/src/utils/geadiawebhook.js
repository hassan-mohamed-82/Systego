"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geideaWebhook = void 0;
const crypto_1 = require("crypto");
const mongoose_1 = __importDefault(require("mongoose"));
const Order_1 = require("../models/schema/users/Order");
const normalize = (value) => String(value ?? "").trim();
const geideaWebhook = async (req, res) => {
    try {
        const payload = (req.body || {});
        const incomingSignature = normalize(payload.signature || req.headers["x-signature"]);
        const merchantOrderId = normalize(payload.merchantReferenceId);
        const geideaOrderId = normalize(payload.orderId);
        const status = normalize(payload.status);
        if (!merchantOrderId || !geideaOrderId) {
            return res.status(400).send("Invalid Payload");
        }
        const geideaSecretKey = normalize(process.env.GEIDEA_HMAC_KEY || process.env.GEIDEA_SECRET_KEY);
        const dataStr = `${normalize(payload.merchantReferenceId)}${normalize(payload.amount)}${normalize(payload.currency)}${normalize(payload.orderId)}${normalize(payload.status)}`;
        const expectedSignature = geideaSecretKey
            ? (0, crypto_1.createHmac)("sha256", geideaSecretKey).update(dataStr).digest("hex")
            : "";
        const SKIP_HMAC_FOR_DEBUG = process.env.SKIP_GEIDEA_HMAC === "true";
        if (!SKIP_HMAC_FOR_DEBUG && geideaSecretKey) {
            if (!incomingSignature || expectedSignature.toLowerCase() !== incomingSignature.toLowerCase()) {
                return res.status(400).send("Invalid Signature");
            }
        }
        else if (!SKIP_HMAC_FOR_DEBUG && !geideaSecretKey) {
            return res.status(500).send("Geidea HMAC key is not configured");
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(merchantOrderId)) {
            return res.status(400).send("Invalid merchantReferenceId");
        }
        const order = await Order_1.OrderModel.findById(merchantOrderId);
        if (!order) {
            return res.status(404).send("Order not found");
        }
        order.geideaTransactionId = geideaOrderId;
        order.geideaCallbackPayload = payload;
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
    }
    catch (error) {
        console.error("Geidea Webhook Error:", error);
        return res.status(500).send("Server Error");
    }
};
exports.geideaWebhook = geideaWebhook;
