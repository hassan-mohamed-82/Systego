import { Request, Response } from "express";
import crypto from "crypto";
import  {OrderModel} from"../models/schema/users/Order"; // عدل على حسب مسار الموديل

const SECRET_KEY = process.env.PAYMOB_SECRET_KEY;

export const paymobWebhook = async (req: Request, res: Response) => {
  try {
    if (!SECRET_KEY) {
      return res.status(500).json({ success: false, message: "PAYMOB_SECRET_KEY is not configured" });
    }

    const hmacHeader = req.query.hmac as string;
    const payload = JSON.stringify(req.body);

    // توليد HMAC
    const generatedHmac = crypto
      .createHmac("sha512", SECRET_KEY)
      .update(payload)
      .digest("hex");

    if (generatedHmac !== hmacHeader) {
      return res.status(400).json({ success: false, message: "Invalid HMAC" });
    }

    // 👇 هنا تقدر تعالج بيانات الطلب
    const data = req.body.obj;

    // مثال: تحديث حالة الطلب
    const order = await OrderModel.findById(data.order.merchant_order_id);
    if (order) {
      order.paymentStatus = data.success ? "paid" : "failed";
      order.paymobCallbackPayload = data;
      await order.save();
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};