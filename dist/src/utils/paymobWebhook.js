"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymobWebhook = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Order_1 = require("../models/schema/users/Order"); // عدل على حسب مسار الموديل
const SECRET_KEY = process.env.PAYMOB_SECRET_KEY;
const paymobWebhook = async (req, res) => {
    try {
        if (!SECRET_KEY) {
            return res.status(500).json({ success: false, message: "PAYMOB_SECRET_KEY is not configured" });
        }
        const hmacHeader = req.query.hmac;
        const payload = JSON.stringify(req.body);
        // توليد HMAC
        const generatedHmac = crypto_1.default
            .createHmac("sha512", SECRET_KEY)
            .update(payload)
            .digest("hex");
        if (generatedHmac !== hmacHeader) {
            return res.status(400).json({ success: false, message: "Invalid HMAC" });
        }
        // 👇 هنا تقدر تعالج بيانات الطلب
        const data = req.body.obj;
        // مثال: تحديث حالة الطلب
        const order = await Order_1.OrderModel.findById(data.order.merchant_order_id);
        if (order) {
            order.paymentStatus = data.success ? "paid" : "failed";
            order.paymobCallbackPayload = data;
            await order.save();
        }
        res.json({ status: "ok" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
exports.paymobWebhook = paymobWebhook;
