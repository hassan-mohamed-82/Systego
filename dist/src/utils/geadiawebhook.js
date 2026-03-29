"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geideaWebhook = void 0;
const crypto_1 = require("crypto");
const mongoose_1 = __importDefault(require("mongoose"));
const Order_1 = require("../models/schema/users/Order");
const Geidea_1 = require("../models/schema/admin/Geidea");
const normalize = (value) => String(value ?? "").trim();
const toLower = (value) => normalize(value).toLowerCase();
const geideaWebhook = async (req, res) => {
    try {
        const bodyPayload = (req.body || {});
        const queryPayload = (req.query || {});
        const payload = Object.keys(bodyPayload).length > 0 ? bodyPayload : queryPayload;
        const incomingSignature = normalize(payload.signature || req.headers["x-signature"] || req.query?.signature);
        const merchantOrderId = normalize(payload.merchantReferenceId);
        const geideaOrderId = normalize(payload.orderId || payload.transactionId || payload.id);
        const status = normalize(payload.status);
        const amountRaw = normalize(payload.amount || payload.amount_cents);
        const currency = normalize(payload.currency || "EGP");
        const strictSignature = toLower(process.env.GEIDEA_STRICT_SIGNATURE) === "true";
        if (!merchantOrderId || !geideaOrderId) {
            return res.status(400).send("Invalid Payload");
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(merchantOrderId)) {
            return res.status(400).send("Invalid merchantReferenceId");
        }
        const order = await Order_1.OrderModel.findById(merchantOrderId);
        if (!order) {
            return res.status(404).send("Order not found");
        }
        if (String(order.paymentGateway || "") !== "geidea") {
            return res.status(400).send("Order is not a Geidea order");
        }
        const geideaConfig = await Geidea_1.GeideaModel.findOne({
            payment_method_id: order.paymentMethod,
            isActive: true,
        })
            .select("webhookSecret")
            .lean();
        const geideaSecretKey = normalize(geideaConfig?.webhookSecret || process.env.GEIDEA_HMAC_KEY || process.env.GEIDEA_SECRET_KEY);
        const signatureParts = `${merchantOrderId}${amountRaw}${currency}${geideaOrderId}${status}`;
        const expectedSignature = geideaSecretKey
            ? (0, crypto_1.createHmac)("sha256", geideaSecretKey).update(signatureParts).digest("hex")
            : "";
        const SKIP_HMAC_FOR_DEBUG = process.env.SKIP_GEIDEA_HMAC === "true";
        const hasSignature = incomingSignature.length > 0;
        const isSignatureValid = !!geideaSecretKey && hasSignature && expectedSignature.toLowerCase() === incomingSignature.toLowerCase();
        if (!SKIP_HMAC_FOR_DEBUG && geideaSecretKey) {
            if (!isSignatureValid && strictSignature) {
                return res.status(400).send("Invalid Signature");
            }
        }
        else if (!SKIP_HMAC_FOR_DEBUG && !geideaSecretKey) {
            return res.status(500).send("Geidea HMAC key is not configured");
        }
        const amountNumber = Number(amountRaw);
        const orderAmount = Number(order.totalOrderPrice || 0);
        const amountMatches = Number.isFinite(amountNumber)
            ? amountNumber === orderAmount || amountNumber === Math.round(orderAmount * 100)
            : true;
        if (!amountMatches) {
            return res.status(400).send("Amount mismatch");
        }
        const existingTransactionId = normalize(order.geideaTransactionId);
        if (existingTransactionId && existingTransactionId === geideaOrderId && order.paymentStatus === "paid") {
            return res.status(200).send("Already processed");
        }
        order.geideaTransactionId = geideaOrderId;
        order.geideaCallbackPayload = {
            callback: payload,
            signatureVerified: SKIP_HMAC_FOR_DEBUG ? null : isSignatureValid,
            signatureProvided: hasSignature,
            strictSignature,
        };
        order.markModified("geideaCallbackPayload");
        const detailedStatus = normalize(payload.detailedStatus).toLowerCase();
        const statusLower = status.toLowerCase();
        const paidStatuses = new Set(["success", "paid", "captured", "authorized"]);
        const isPaid = paidStatuses.has(statusLower) || paidStatuses.has(detailedStatus);
        if (isPaid) {
            if (order.paymentStatus === "paid" && order.status === "approved") {
                await order.save();
                return res.status(200).send("Already processed");
            }
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
