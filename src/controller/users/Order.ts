import { Request, Response } from "express";
import mongoose from "mongoose";
import axios from "axios";
import crypto from "crypto";
import { CartModel } from "../../models/schema/users/Cart";
import { OrderModel } from "../../models/schema/users/Order";
import { ProductModel } from "../../models/schema/admin/products";
import { AddressModel } from "../../models/schema/users/Address";
import { ShippingSettingsModel } from "../../models/schema/admin/ShippingSettings";
import { PaymentMethodModel } from "../../models/schema/admin/payment_methods";
import { PaymobModel } from "../../models/schema/admin/Paymob";
import { CustomerModel } from "../../models/schema/admin/POS/customer";
import { SuccessResponse } from "../../utils/response";
import { NotFound, BadRequest } from "../../Errors";

const PAYMOB_BASE_URL = "https://accept.paymob.com/api";

const toBoolean = (value: unknown): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    if (typeof value === "number") return value === 1;
    return false;
};

const toSafeString = (value: unknown, fallback: string = "NA") => {
    if (value === null || value === undefined) return fallback;
    const normalized = String(value).trim();
    return normalized.length ? normalized : fallback;
};

const normalizeOrderId = (orderRef: unknown): string => {
    if (!orderRef) return "";
    if (typeof orderRef === "string") return orderRef;
    if (typeof orderRef === "object") {
        const candidate = orderRef as { id?: string; _id?: string };
        return candidate.id || candidate._id || "";
    }
    return String(orderRef);
};

const generatePaymobRedirectHmac = (payload: Record<string, any>, hmacKey: string): string => {
    const values = [
        toSafeString(payload.amount_cents, ""),
        toSafeString(payload.created_at, ""),
        toSafeString(payload.currency, ""),
        String(toBoolean(payload.error)),
        String(toBoolean(payload.has_parent_transaction)),
        toSafeString(payload.id, ""),
        toSafeString(payload.integration_id, ""),
        String(toBoolean(payload.is_3d_secure)),
        String(toBoolean(payload.is_auth)),
        String(toBoolean(payload.is_capture)),
        String(toBoolean(payload.is_refunded)),
        String(toBoolean(payload.is_standalone_payment)),
        toSafeString(normalizeOrderId(payload.order), ""),
        toSafeString(payload.owner, ""),
        String(toBoolean(payload.pending)),
        toSafeString(payload.source_data?.pan, ""),
        toSafeString(payload.source_data?.sub_type, ""),
        toSafeString(payload.source_data?.type, ""),
        String(toBoolean(payload.success)),
    ].join("");

    return crypto.createHmac("sha512", hmacKey).update(values).digest("hex");
};

const initializePaymobPayment = async ({
    localOrderId,
    amount,
    paymobConfig,
    customer,
    address,
}: {
    localOrderId: string;
    amount: number;
    paymobConfig: any;
    customer: any;
    address: any;
}) => {
    const authResponse = await axios.post(`${PAYMOB_BASE_URL}/auth/tokens`, {
        api_key: paymobConfig.api_key,
    });
    const authData = authResponse.data as any;

    const authToken = authData?.token;
    if (!authToken) throw new BadRequest("Failed to authenticate with Paymob");

    const amountCents = Math.round(Number(amount) * 100);
    if (amountCents <= 0) throw new BadRequest("Order amount is invalid for Paymob payment");

    const paymobOrderResponse = await axios.post(`${PAYMOB_BASE_URL}/ecommerce/orders`, {
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: "EGP",
        merchant_order_id: localOrderId,
        items: [],
    });
    const paymobOrderData = paymobOrderResponse.data as any;

    const paymobOrderId = paymobOrderData?.id;
    if (!paymobOrderId) throw new BadRequest("Failed to create Paymob order");

    const customerName = toSafeString(customer?.name, "Customer");
    const [firstName, ...lastNameParts] = customerName.split(" ");
    const lastName = lastNameParts.join(" ") || "Customer";

    const billingData = {
        apartment: toSafeString(address?.apartmentNumber, "NA"),
        email: toSafeString(customer?.email, "no-reply@example.com"),
        floor: toSafeString(address?.floorNumber, "NA"),
        first_name: toSafeString(firstName, "Customer"),
        street: toSafeString(address?.street, "NA"),
        building: toSafeString(address?.buildingNumber, "NA"),
        phone_number: toSafeString(customer?.phone_number, "00000000000"),
        shipping_method: "NA",
        postal_code: "NA",
        city: toSafeString((address.city as any)?.name, "NA"),
        country: toSafeString((address.country as any)?.name, "EG"),
        last_name: toSafeString(lastName, "Customer"),
        state: toSafeString((address.zone as any)?.name, "NA"),
    };

    const paymentKeyResponse = await axios.post(`${PAYMOB_BASE_URL}/acceptance/payment_keys`, {
        auth_token: authToken,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: paymobOrderId,
        billing_data: billingData,
        currency: "EGP",
        integration_id: Number(paymobConfig.integration_id),
        lock_order_when_paid: false,
    });
    const paymentKeyData = paymentKeyResponse.data as any;

    const paymentToken = paymentKeyData?.token;
    if (!paymentToken) throw new BadRequest("Failed to generate Paymob payment token");

    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${paymobConfig.iframe_id}?payment_token=${paymentToken}`;

    return {
        paymobOrderId: String(paymobOrderId),
        iframeUrl,
    };
};

// (Checkout)
export const createOrder = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];
    const { shippingAddress, paymentMethod, proofImage } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. تحديد سلة التسوق (مستخدم أو ضيف)
        const cartQuery = userId ? { user: userId } : { sessionId: sessionId };
        if (!userId && !sessionId) throw new BadRequest("Identification (User or Session) is required");

        const cart = await CartModel.findOne(cartQuery).session(session);
        if (!cart || cart.cartItems.length === 0) {
            throw new BadRequest("Your cart is empty");
        }

        // 2. التحقق من طريقة الدفع
        const paymentMethodDoc = await PaymentMethodModel.findOne({
            _id: paymentMethod,
            isActive: { $ne: false }
        }).session(session);

        if (!paymentMethodDoc) {
            throw new BadRequest("Invalid or inactive payment method selected");
        }

        if (paymentMethodDoc.type === "manual" && !proofImage) {
            throw new BadRequest("Proof image is required for manual payment methods");
        }

        // 3. جلب العنوان وحساب الشحن
        const address = await AddressModel.findOne({ _id: shippingAddress, user: userId })
            .populate("city zone country")
            .session(session);

        if (!address) throw new NotFound("Shipping address not found");

        const productIds = cart.cartItems.map((item) => item.product);
        const freeShippingProductsCount = await ProductModel.countDocuments({
            _id: { $in: productIds },
            free_shipping: true,
        }).session(session);

        const hasFreeShippingProduct = freeShippingProductsCount > 0;

        const shippingSettings = await ShippingSettingsModel.findOne({ singletonKey: "default" }).session(session);

        const selectedMethod = shippingSettings?.shippingMethod || "zone";
        const zoneShippingCost = (address.zone as any)?.shipingCost || (address.city as any)?.shipingCost || 0;

        let shippingCost = 0;

        if (shippingSettings?.freeShippingEnabled || hasFreeShippingProduct) {
            shippingCost = 0;
        } else if (selectedMethod === "flat_rate") {
            shippingCost = Number(shippingSettings?.flatRate || 0);
        } else if (selectedMethod === "carrier") {
            shippingCost = Number(shippingSettings?.carrierRate || 0);
        } else {
            shippingCost = Number(zoneShippingCost || 0);
        }

        // 4. تحديث المخزون وحساب إجمالي المنتجات
        let actualProductsTotal = 0;
        const finalCartItems = [];

        for (const item of cart.cartItems) {
            const requestedQuantity = item.quantity ?? 1;

            const updatedProduct = await ProductModel.findOneAndUpdate(
                { _id: item.product, quantity: { $gte: requestedQuantity } },
                { $inc: { quantity: -requestedQuantity } },
                { session, new: true }
            );

            if (!updatedProduct) {
                throw new BadRequest(`Product with ID ${item.product} is out of stock or insufficient`);
            }

            const currentPrice = updatedProduct.price || 0;
            actualProductsTotal += currentPrice * requestedQuantity;

            finalCartItems.push({
                product: updatedProduct._id.toString(), // تحويل لـ String لحل خطأ TS
                quantity: requestedQuantity,
                price: currentPrice
            });
        }

        const finalTotalPrice = actualProductsTotal + shippingCost;

        const order = await OrderModel.create([{
            user: userId,
            cartItems: finalCartItems,
            shippingAddress: {
                details: `${address.street}, Bldg ${address.buildingNumber}`,
                city: String((address.city as any)?.name || ""),
                zone: String((address.zone as any)?.name || ""),
            },
            shippingPrice: shippingCost,
            totalOrderPrice: finalTotalPrice,
            paymentMethod: paymentMethod.toString(),
            proofImage,
            status: "pending",
            paymentGateway: paymentMethodDoc.type === "automatic" ? "paymob" : "manual",
            paymentStatus: paymentMethodDoc.type === "automatic" ? "pending" : "unpaid",
        }], { session });

        let paymobData: { paymobOrderId: string; iframeUrl: string } | null = null;

        // 6. التعامل مع بوابة الدفع (Paymob)
        if (paymentMethodDoc.type === "automatic") {
            const paymobConfig = await PaymobModel.findOne({
                payment_method_id: paymentMethodDoc._id,
                isActive: true,
            }).session(session);

            if (!paymobConfig) {
                throw new BadRequest("بوابة الدفع غير مفعلة أو لم يتم إعدادها من قبل الإدارة");
            }

            const customer = await CustomerModel.findById(userId).session(session);
            if (!customer) {
                throw new NotFound("Customer not found");
            }

            paymobData = await initializePaymobPayment({
                localOrderId: order[0]._id.toString(),
                amount: finalTotalPrice,
                paymobConfig,
                customer,
                address,
            });

            order[0].paymobOrderId = paymobData.paymobOrderId;
            order[0].paymobIframeUrl = paymobData.iframeUrl;
            await order[0].save({ session });
        }

        // 7. مسح السلة وإتمام العملية
        await CartModel.findOneAndDelete(cartQuery).session(session);
        await session.commitTransaction();
        session.endSession();

        SuccessResponse(res, {
            message: "Order placed successfully",
            order: order[0],
            payment: paymobData
                ? {
                    gateway: "paymob",
                    paymentStatus: "pending",
                    iframeUrl: paymobData.iframeUrl,
                    paymobOrderId: paymobData.paymobOrderId,
                }
                : null,
        }, 201);

    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};
export const getMyOrders = async (req: Request, res: Response) => {
    const orders = await OrderModel.find({ user: req.user?.id })
        .populate('paymentMethod', 'name ar_name')
        .sort({ createdAt: -1 });

    SuccessResponse(res, { orders });
};

export const getOrderDetails = async (req: Request, res: Response) => {
    const { id } = req.params;

    const order = await OrderModel.findOne({ _id: id, user: req.user?.id })
        .populate('cartItems.product', 'name image')
        .populate('paymentMethod', 'name ar_name');

    if (!order) throw new NotFound("Order not found");

    SuccessResponse(res, { order });
};

export const paymobCallback = async (req: Request, res: Response) => {
    const payload = (req.body?.obj ? req.body.obj : req.query) as Record<string, any>;
    const incomingHmac = toSafeString(req.body?.hmac || req.query?.hmac, "").toLowerCase();

    console.log("🔔 PAYMOB CALLBACK RECEIVED");
    console.log("📦 Payload:", JSON.stringify(payload, null, 2));
    console.log("📝 Incoming HMAC:", incomingHmac);
    console.log("📋 Request Body:", JSON.stringify(req.body, null, 2));
    console.log("🔍 Request Query:", JSON.stringify(req.query, null, 2));

    if (!incomingHmac) {
        console.error("❌ Missing HMAC");
        throw new BadRequest("Missing Paymob HMAC");
    }

    const paymobConfig = await PaymobModel.findOne();
    if (!paymobConfig) {
        console.error("❌ Paymob Config not found");
        throw new BadRequest("Paymob configuration not found");
    }

    const expectedHmac = generatePaymobRedirectHmac(payload, paymobConfig.hmac_key).toLowerCase();
    console.log("🔐 Expected HMAC:", expectedHmac);
    console.log("✅ HMAC Match:", expectedHmac === incomingHmac);
    console.log("🔑 HMAC Key used:", paymobConfig.hmac_key.substring(0, 5) + "...");

    // TEMPORARY: Skip HMAC verification for debugging (remove in production!)
    const SKIP_HMAC_FOR_DEBUG = process.env.SKIP_PAYMOB_HMAC === "true";
    if (SKIP_HMAC_FOR_DEBUG) {
        console.warn("⚠️  HMAC VERIFICATION SKIPPED (DEBUG MODE)");
    } else if (expectedHmac !== incomingHmac) {
        console.error("❌ HMAC Mismatch");
        throw new BadRequest("Invalid Paymob HMAC signature");
    }

    const paymobOrderId = toSafeString(normalizeOrderId(payload.order), "");
    const merchantOrderId = toSafeString((payload.order as any)?.merchant_order_id, "");
    const transactionId = toSafeString(payload.id, "");
    const isSuccess = toBoolean(payload.success);

    console.log("🎯 Paymob Order ID:", paymobOrderId);
    console.log("🧾 Merchant Order ID:", merchantOrderId);
    console.log("💳 Transaction ID:", transactionId);
    console.log("✨ Is Success:", isSuccess);

    if (!paymobOrderId && !merchantOrderId) {
        console.error("❌ Missing Paymob and Merchant Order IDs");
        throw new BadRequest("Missing order identifiers in callback payload");
    }

    let order = paymobOrderId ? await OrderModel.findOne({ paymobOrderId }) : null;
    if (!order && merchantOrderId && mongoose.isValidObjectId(merchantOrderId)) {
        order = await OrderModel.findById(merchantOrderId);
    }
    console.log("📌 Local Order Found:", !!order, order?._id);

    if (!order) {
        console.error("❌ Order not found with paymobOrderId:", paymobOrderId);
        throw new NotFound("Order not found for this Paymob callback");
    }

    if (order.paymentStatus === "paid") {
        console.log("⏭️  Payment already marked as paid, skipping duplicate callback");
        return SuccessResponse(res, {
            message: "Payment already confirmed",
            orderId: order._id,
            paymentStatus: order.paymentStatus,
        });
    }

    order.paymobTransactionId = transactionId;
    order.paymobCallbackPayload = req.body?.obj || req.query;

    if (isSuccess) {
        console.log("✔️ MARKING ORDER AS APPROVED (paid)");
        order.paymentStatus = "paid";
        order.status = "approved";
        await order.save();
        console.log("✅ Order saved successfully:", order._id);

        return SuccessResponse(res, {
            message: "Payment callback processed successfully",
            orderId: order._id,
            paymentStatus: order.paymentStatus,
        });
    }

    const failedSession = await mongoose.startSession();
    failedSession.startTransaction();

    try {
        console.log("❌ MARKING ORDER AS REJECTED (payment failed)");
        if (order.paymentStatus !== "failed") {
            for (const item of order.cartItems) {
                if (item.product && item.quantity) {
                    await ProductModel.findByIdAndUpdate(
                        item.product,
                        { $inc: { quantity: Number(item.quantity) } },
                        { session: failedSession }
                    );
                }
            }
        }

        order.paymentStatus = "failed";
        order.status = "rejected";
        await order.save({ session: failedSession });
        console.log("✅ Order marked as rejected and saved:", order._id);

        await failedSession.commitTransaction();
        failedSession.endSession();
    } catch (error) {
        await failedSession.abortTransaction();
        failedSession.endSession();
        throw error;
    }

    return SuccessResponse(res, {
        message: "Payment marked as failed",
        orderId: order._id,
        paymentStatus: order.paymentStatus,
    });
};

export const verifyPaymobPayment = async (req: Request, res: Response) => {
    const payload = (req.body?.payload || req.body?.obj || req.body) as Record<string, any>;
    const incomingHmac = toSafeString(req.body?.hmac || payload?.hmac, "").toLowerCase();

    if (!payload || Object.keys(payload).length === 0) {
        throw new BadRequest("Missing payload");
    }

    if (!incomingHmac) {
        throw new BadRequest("Missing hmac");
    }

    const paymobConfig = await PaymobModel.findOne();
    if (!paymobConfig) {
        throw new BadRequest("Paymob configuration not found");
    }

    const expectedHmac = generatePaymobRedirectHmac(payload, paymobConfig.hmac_key).toLowerCase();
    const hmacMatched = expectedHmac === incomingHmac;

    const skipHmac = process.env.SKIP_PAYMOB_HMAC === "true";
    if (!hmacMatched && !skipHmac) {
        return SuccessResponse(res, {
            ok: false,
            reason: "HMAC_MISMATCH",
            incomingHmac,
            expectedHmac,
        }, 200);
    }

    const paymobOrderId = toSafeString(normalizeOrderId(payload.order), "");
    const merchantOrderId = toSafeString((payload.order as any)?.merchant_order_id, "");
    const transactionId = toSafeString(payload.id, "");
    const isSuccess = toBoolean(payload.success);

    let order = paymobOrderId ? await OrderModel.findOne({ paymobOrderId }) : null;
    if (!order && merchantOrderId && mongoose.isValidObjectId(merchantOrderId)) {
        order = await OrderModel.findById(merchantOrderId);
    }

    if (!order) {
        return SuccessResponse(res, {
            ok: false,
            reason: "ORDER_NOT_FOUND",
            paymobOrderId,
            merchantOrderId,
            transactionId,
            hmacMatched,
        }, 200);
    }

    order.paymobTransactionId = transactionId;
    order.paymobCallbackPayload = payload;

    if (isSuccess) {
        order.paymentStatus = "paid";
        order.status = "approved";
        await order.save();

        return SuccessResponse(res, {
            ok: true,
            reason: "PAYMENT_CONFIRMED",
            orderId: order._id,
            paymentStatus: order.paymentStatus,
            orderStatus: order.status,
            hmacMatched,
            paymobOrderId,
            merchantOrderId,
            transactionId,
        }, 200);
    }

    order.paymentStatus = "failed";
    order.status = "rejected";
    await order.save();

    return SuccessResponse(res, {
        ok: true,
        reason: "PAYMENT_FAILED",
        orderId: order._id,
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
        hmacMatched,
        paymobOrderId,
        merchantOrderId,
        transactionId,
    }, 200);
};