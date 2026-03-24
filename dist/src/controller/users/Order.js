"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymobCallback = exports.getOrderDetails = exports.getMyOrders = exports.createOrder = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const Cart_1 = require("../../models/schema/users/Cart");
const Order_1 = require("../../models/schema/users/Order");
const products_1 = require("../../models/schema/admin/products");
const Address_1 = require("../../models/schema/users/Address");
const ShippingSettings_1 = require("../../models/schema/admin/ShippingSettings");
const payment_methods_1 = require("../../models/schema/admin/payment_methods");
const Paymob_1 = require("../../models/schema/admin/Paymob");
const customer_1 = require("../../models/schema/admin/POS/customer");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const PAYMOB_BASE_URL = "https://accept.paymob.com/api";
const toBoolean = (value) => {
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string")
        return value.toLowerCase() === "true";
    if (typeof value === "number")
        return value === 1;
    return false;
};
const toSafeString = (value, fallback = "NA") => {
    if (value === null || value === undefined)
        return fallback;
    const normalized = String(value).trim();
    return normalized.length ? normalized : fallback;
};
const normalizeOrderId = (orderRef) => {
    if (!orderRef)
        return "";
    if (typeof orderRef === "string")
        return orderRef;
    if (typeof orderRef === "object") {
        const candidate = orderRef;
        return candidate.id || candidate._id || "";
    }
    return String(orderRef);
};
const generatePaymobRedirectHmac = (payload, hmacKey) => {
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
    return crypto_1.default.createHmac("sha512", hmacKey).update(values).digest("hex");
};
const initializePaymobPayment = async ({ localOrderId, amount, paymobConfig, customer, address, }) => {
    const authResponse = await axios_1.default.post(`${PAYMOB_BASE_URL}/auth/tokens`, {
        api_key: paymobConfig.api_key,
    });
    const authData = authResponse.data;
    const authToken = authData?.token;
    if (!authToken)
        throw new Errors_1.BadRequest("Failed to authenticate with Paymob");
    const amountCents = Math.round(Number(amount) * 100);
    if (amountCents <= 0)
        throw new Errors_1.BadRequest("Order amount is invalid for Paymob payment");
    const paymobOrderResponse = await axios_1.default.post(`${PAYMOB_BASE_URL}/ecommerce/orders`, {
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: "EGP",
        merchant_order_id: localOrderId,
        items: [],
    });
    const paymobOrderData = paymobOrderResponse.data;
    const paymobOrderId = paymobOrderData?.id;
    if (!paymobOrderId)
        throw new Errors_1.BadRequest("Failed to create Paymob order");
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
        city: toSafeString(address.city?.name, "NA"),
        country: toSafeString(address.country?.name, "EG"),
        last_name: toSafeString(lastName, "Customer"),
        state: toSafeString(address.zone?.name, "NA"),
    };
    const paymentKeyResponse = await axios_1.default.post(`${PAYMOB_BASE_URL}/acceptance/payment_keys`, {
        auth_token: authToken,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: paymobOrderId,
        billing_data: billingData,
        currency: "EGP",
        integration_id: Number(paymobConfig.integration_id),
        lock_order_when_paid: false,
    });
    const paymentKeyData = paymentKeyResponse.data;
    const paymentToken = paymentKeyData?.token;
    if (!paymentToken)
        throw new Errors_1.BadRequest("Failed to generate Paymob payment token");
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${paymobConfig.iframe_id}?payment_token=${paymentToken}`;
    return {
        paymobOrderId: String(paymobOrderId),
        iframeUrl,
    };
};
// (Checkout)
const createOrder = async (req, res) => {
    const userId = req.user?.id;
    const { shippingAddress, paymentMethod, proofImage } = req.body;
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const cart = await Cart_1.CartModel.findOne({ user: userId }).session(session);
        if (!cart || cart.cartItems.length === 0) {
            throw new Errors_1.BadRequest("Your cart is empty");
        }
        const paymentMethodDoc = await payment_methods_1.PaymentMethodModel.findOne({
            _id: paymentMethod,
            isActive: { $ne: false }
        }).session(session);
        if (!paymentMethodDoc) {
            throw new Errors_1.BadRequest("Invalid or inactive payment method selected");
        }
        if (paymentMethodDoc.type === "manual" && !proofImage) {
            throw new Errors_1.BadRequest("Proof image is required for manual payment methods");
        }
        const address = await Address_1.AddressModel.findOne({ _id: shippingAddress, user: userId })
            .populate("city zone country")
            .session(session);
        if (!address)
            throw new Errors_1.NotFound("Shipping address not found");
        const productIds = cart.cartItems.map((item) => item.product);
        const freeShippingProductsCount = await products_1.ProductModel.countDocuments({
            _id: { $in: productIds },
            free_shipping: true,
        }).session(session);
        const hasFreeShippingProduct = freeShippingProductsCount > 0;
        const shippingSettings = await ShippingSettings_1.ShippingSettingsModel.findOne({ singletonKey: "default" }).session(session);
        const selectedMethod = shippingSettings?.shippingMethod || "zone";
        const zoneShippingCost = address.zone?.shipingCost || address.city?.shipingCost || 0;
        let shippingCost = 0;
        if (shippingSettings?.freeShippingEnabled || hasFreeShippingProduct) {
            shippingCost = 0;
        }
        else if (selectedMethod === "flat_rate") {
            shippingCost = Number(shippingSettings?.flatRate || 0);
        }
        else if (selectedMethod === "carrier") {
            shippingCost = Number(shippingSettings?.carrierRate || 0);
        }
        else {
            shippingCost = Number(zoneShippingCost || 0);
        }
        let actualProductsTotal = 0;
        const finalCartItems = [];
        for (const item of cart.cartItems) {
            const requestedQuantity = item.quantity ?? 1;
            const updatedProduct = await products_1.ProductModel.findOneAndUpdate({ _id: item.product, quantity: { $gte: requestedQuantity } }, { $inc: { quantity: -requestedQuantity } }, { session, new: true });
            if (!updatedProduct) {
                throw new Errors_1.BadRequest(`Product with ID ${item.product} is out of stock or insufficient`);
            }
            const currentPrice = updatedProduct.price || 0;
            actualProductsTotal += currentPrice * requestedQuantity;
            finalCartItems.push({
                product: updatedProduct._id,
                quantity: requestedQuantity,
                price: currentPrice
            });
        }
        const finalTotalPrice = actualProductsTotal + shippingCost;
        const order = await Order_1.OrderModel.create([{
                user: userId,
                cartItems: finalCartItems,
                shippingAddress: {
                    details: `${address.street}, Bldg ${address.buildingNumber}`,
                    city: address.city?.name || "",
                    zone: address.zone?.name || "",
                },
                shippingPrice: shippingCost,
                totalOrderPrice: finalTotalPrice,
                paymentMethod,
                proofImage,
                status: "pending",
                paymentGateway: paymentMethodDoc.type === "automatic" ? "paymob" : "manual",
                paymentStatus: paymentMethodDoc.type === "automatic" ? "pending" : "unpaid",
            }], { session });
        let paymobData = null;
        if (paymentMethodDoc.type === "automatic") {
            const paymobConfig = await Paymob_1.PaymobModel.findOne({
                payment_method_id: paymentMethodDoc._id,
                isActive: true,
            }).session(session);
            if (!paymobConfig) {
                throw new Errors_1.BadRequest("بوابة الدفع غير مفعلة أو لم يتم إعدادها من قبل الإدارة");
            }
            const customer = await customer_1.CustomerModel.findById(userId).session(session);
            if (!customer) {
                throw new Errors_1.NotFound("Customer not found");
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
        await Cart_1.CartModel.findOneAndDelete({ user: userId }).session(session);
        await session.commitTransaction();
        session.endSession();
        (0, response_1.SuccessResponse)(res, {
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
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};
exports.createOrder = createOrder;
const getMyOrders = async (req, res) => {
    const orders = await Order_1.OrderModel.find({ user: req.user?.id })
        .populate('paymentMethod', 'name ar_name')
        .sort({ createdAt: -1 });
    (0, response_1.SuccessResponse)(res, { orders });
};
exports.getMyOrders = getMyOrders;
const getOrderDetails = async (req, res) => {
    const { id } = req.params;
    const order = await Order_1.OrderModel.findOne({ _id: id, user: req.user?.id })
        .populate('cartItems.product', 'name image')
        .populate('paymentMethod', 'name ar_name');
    if (!order)
        throw new Errors_1.NotFound("Order not found");
    (0, response_1.SuccessResponse)(res, { order });
};
exports.getOrderDetails = getOrderDetails;
const paymobCallback = async (req, res) => {
    const payload = (req.body?.obj ? req.body.obj : req.query);
    const incomingHmac = toSafeString(req.body?.hmac || req.query?.hmac, "").toLowerCase();
    console.log("🔔 PAYMOB CALLBACK RECEIVED");
    console.log("📦 Payload:", JSON.stringify(payload, null, 2));
    console.log("📝 Incoming HMAC:", incomingHmac);
    console.log("📋 Request Body:", JSON.stringify(req.body, null, 2));
    console.log("🔍 Request Query:", JSON.stringify(req.query, null, 2));
    if (!incomingHmac) {
        console.error("❌ Missing HMAC");
        throw new Errors_1.BadRequest("Missing Paymob HMAC");
    }
    const paymobConfig = await Paymob_1.PaymobModel.findOne();
    if (!paymobConfig) {
        console.error("❌ Paymob Config not found");
        throw new Errors_1.BadRequest("Paymob configuration not found");
    }
    const expectedHmac = generatePaymobRedirectHmac(payload, paymobConfig.hmac_key).toLowerCase();
    console.log("🔐 Expected HMAC:", expectedHmac);
    console.log("✅ HMAC Match:", expectedHmac === incomingHmac);
    console.log("🔑 HMAC Key used:", paymobConfig.hmac_key.substring(0, 5) + "...");
    // TEMPORARY: Skip HMAC verification for debugging (remove in production!)
    const SKIP_HMAC_FOR_DEBUG = process.env.SKIP_PAYMOB_HMAC === "true";
    if (SKIP_HMAC_FOR_DEBUG) {
        console.warn("⚠️  HMAC VERIFICATION SKIPPED (DEBUG MODE)");
    }
    else if (expectedHmac !== incomingHmac) {
        console.error("❌ HMAC Mismatch");
        throw new Errors_1.BadRequest("Invalid Paymob HMAC signature");
    }
    const paymobOrderId = toSafeString(normalizeOrderId(payload.order), "");
    const transactionId = toSafeString(payload.id, "");
    const isSuccess = toBoolean(payload.success);
    console.log("🎯 Paymob Order ID:", paymobOrderId);
    console.log("💳 Transaction ID:", transactionId);
    console.log("✨ Is Success:", isSuccess);
    if (!paymobOrderId) {
        console.error("❌ Missing Paymob Order ID");
        throw new Errors_1.BadRequest("Missing Paymob order id in callback payload");
    }
    const order = await Order_1.OrderModel.findOne({ paymobOrderId });
    console.log("📌 Local Order Found:", !!order, order?._id);
    if (!order) {
        console.error("❌ Order not found with paymobOrderId:", paymobOrderId);
        throw new Errors_1.NotFound("Order not found for this Paymob callback");
    }
    if (order.paymentStatus === "paid") {
        console.log("⏭️  Payment already marked as paid, skipping duplicate callback");
        return (0, response_1.SuccessResponse)(res, {
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
        return (0, response_1.SuccessResponse)(res, {
            message: "Payment callback processed successfully",
            orderId: order._id,
            paymentStatus: order.paymentStatus,
        });
    }
    const failedSession = await mongoose_1.default.startSession();
    failedSession.startTransaction();
    try {
        console.log("❌ MARKING ORDER AS REJECTED (payment failed)");
        if (order.paymentStatus !== "failed") {
            for (const item of order.cartItems) {
                if (item.product && item.quantity) {
                    await products_1.ProductModel.findByIdAndUpdate(item.product, { $inc: { quantity: Number(item.quantity) } }, { session: failedSession });
                }
            }
        }
        order.paymentStatus = "failed";
        order.status = "rejected";
        await order.save({ session: failedSession });
        console.log("✅ Order marked as rejected and saved:", order._id);
        await failedSession.commitTransaction();
        failedSession.endSession();
    }
    catch (error) {
        await failedSession.abortTransaction();
        failedSession.endSession();
        throw error;
    }
    return (0, response_1.SuccessResponse)(res, {
        message: "Payment marked as failed",
        orderId: order._id,
        paymentStatus: order.paymentStatus,
    });
};
exports.paymobCallback = paymobCallback;
