"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fawryWebhook = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Order_1 = require("../models/schema/users/Order");
const Fawry_1 = require("../models/schema/admin/Fawry");
const fawryWebhook = async (req, res) => {
    try {
        const payload = req.body;
        const { requestId, fawryRefNumber, merchantRefNumber, customerMobile, customerMail, paymentAmount, orderAmount, fawryFees, shippingFees, orderStatus, paymentMethod, messageSignature, paymentRefrenceNumber } = payload;
        if (!merchantRefNumber || !fawryRefNumber) {
            return res.status(400).send("Invalid Payload");
        }
        const order = await Order_1.OrderModel.findById(merchantRefNumber);
        if (!order) {
            return res.status(404).send("Order not found");
        }
        if (String(order.paymentGateway || "") !== "fawry") {
            return res.status(400).send("Order is not a Fawry order");
        }
        const fawryConfig = await Fawry_1.FawryModel.findOne({
            payment_method_id: order.paymentMethod,
            isActive: true,
        }).lean();
        if (!fawryConfig) {
            return res.status(500).send("Fawry configuration not found");
        }
        const hashString = `${fawryRefNumber}${merchantRefNumber}${Number(paymentAmount).toFixed(2)}${Number(orderAmount).toFixed(2)}${orderStatus}${paymentMethod}${paymentRefrenceNumber || ""}${fawryConfig.secureKey}`;
        const expectedSignature = crypto_1.default.createHash("sha256").update(hashString).digest("hex");
        const isSignatureValid = expectedSignature.toLowerCase() === messageSignature?.toLowerCase();
        if (!isSignatureValid && process.env.FAWRY_STRICT_SIGNATURE === "true") {
            return res.status(400).send("Invalid Signature");
        }
        order.fawryTransactionId = fawryRefNumber;
        order.fawryCallbackPayload = {
            callback: payload,
            signatureVerified: isSignatureValid,
        };
        order.markModified("fawryCallbackPayload");
        const statusLower = String(orderStatus).toLowerCase();
        if (statusLower === "paid" || statusLower === "new") {
            if (order.paymentStatus === "paid" && order.status === "approved") {
                return res.status(200).send("Already processed");
            }
            order.status = "approved";
            order.paymentStatus = "paid";
            await order.save();
            return res.status(200).send("OK");
        }
        if (statusLower === "canceled" || statusLower === "failed" || statusLower === "expired") {
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
        console.error("Fawry Webhook Error:", error);
        return res.status(500).send("Server Error");
    }
};
exports.fawryWebhook = fawryWebhook;
