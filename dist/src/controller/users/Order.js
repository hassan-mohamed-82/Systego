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
        city: toSafeString(address?.city?.name, "NA"),
        country: toSafeString(address?.country?.name, "EG"),
        last_name: toSafeString(lastName, "Customer"),
        state: toSafeString(address?.zone?.name, "NA"),
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
    // نبدأ الجلسة (Transaction) لضمان سلامة البيانات
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        // أ. التأكد من وجود السلة وأنها ليست فارغة
        const cart = await Cart_1.CartModel.findOne({ user: userId }).session(session);
        if (!cart || cart.cartItems.length === 0) {
            throw new Errors_1.BadRequest("Your cart is empty");
        }
        // أ-2. تأكيد صحة وسيلة الدفع وأنها مفعلة
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
        // ب. التأكد من وجود العنوان وجلب بيانات الشحن منه (Populate Zone)
        const address = await Address_1.AddressModel.findOne({ _id: shippingAddress, user: userId })
            .populate('city zone country')
            .session(session);
        if (!address)
            throw new Errors_1.NotFound("Shipping address not found");
        // ج. تحديد ما إذا كانت أياً من منتجات السلة مؤهلة للشحن المجاني (Marketing free shipping per product)
        const productIds = cart.cartItems.map((item) => item.product);
        const freeShippingProductsCount = await products_1.ProductModel.countDocuments({
            _id: { $in: productIds },
            free_shipping: true,
        }).session(session);
        const hasFreeShippingProduct = freeShippingProductsCount > 0;
        // د. جلب إعدادات الشحن الحالية (اختيار طريقة واحدة فقط)
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
        // هـ. تحديث المخزن وإعادة احتساب أسعار المنتجات
        let actualProductsTotal = 0;
        const finalCartItems = [];
        for (const item of cart.cartItems) {
            const requestedQuantity = item.quantity ?? 1;
            // استخدام findOneAndUpdate لضمان عدم حدوث Race Condition
            const updatedProduct = await products_1.ProductModel.findOneAndUpdate({ _id: item.product, quantity: { $gte: requestedQuantity } }, { $inc: { quantity: -requestedQuantity } }, { session, new: true });
            if (!updatedProduct) {
                throw new Errors_1.BadRequest(`Product with ID ${item.product} is out of stock or insufficient`);
            }
            const currentPrice = updatedProduct.price || 0;
            actualProductsTotal += (currentPrice * requestedQuantity);
            finalCartItems.push({
                product: updatedProduct._id,
                quantity: requestedQuantity,
                price: currentPrice
            });
        }
        const finalTotalPrice = actualProductsTotal + shippingCost;
        // و. إنشاء الأوردر (أخذ لقطة Snapshot من البيانات الحالية)
        const order = await Order_1.OrderModel.create([{
                user: userId,
                cartItems: finalCartItems, // تخزين المنتجات بأسعارها الحالية
                shippingAddress: {
                    details: `${address.street}, Bldg ${address.buildingNumber}`,
                    city: address.city?.name || "",
                    zone: address.zone?.name || "",
                },
                shippingPrice: shippingCost,
                totalOrderPrice: finalTotalPrice,
                paymentMethod,
                proofImage,
                status: 'pending',
                paymentGateway: paymentMethodDoc.type === "automatic" ? "paymob" : "manual",
                paymentStatus: paymentMethodDoc.type === "automatic" ? "pending" : "unpaid",
            }], { session });
        let paymobData = null;
        if (paymentMethodDoc.type === "automatic") {
            const paymobConfig = await Paymob_1.PaymobModel.findOne({
                payment_method_id: paymentMethodDoc._id,
            }).session(session);
            if (!paymobConfig) {
                throw new Errors_1.BadRequest("Paymob settings are not configured for this payment method");
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
        // ز. مسح السلة بعد نجاح العملية
        await Cart_1.CartModel.findOneAndDelete({ user: userId }).session(session);
        // إنهاء العملية بنجاح
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
        // في حالة حدوث أي خطأ، تراجع عن كل التغييرات (خصم المخزن لن يتم)
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
    if (!incomingHmac) {
        throw new Errors_1.BadRequest("Missing Paymob HMAC");
    }
    const paymobConfig = await Paymob_1.PaymobModel.findOne();
    if (!paymobConfig) {
        throw new Errors_1.BadRequest("Paymob configuration not found");
    }
    const expectedHmac = generatePaymobRedirectHmac(payload, paymobConfig.hmac_key).toLowerCase();
    if (expectedHmac !== incomingHmac) {
        throw new Errors_1.BadRequest("Invalid Paymob HMAC signature");
    }
    const paymobOrderId = toSafeString(normalizeOrderId(payload.order), "");
    const transactionId = toSafeString(payload.id, "");
    const isSuccess = toBoolean(payload.success);
    if (!paymobOrderId) {
        throw new Errors_1.BadRequest("Missing Paymob order id in callback payload");
    }
    const order = await Order_1.OrderModel.findOne({ paymobOrderId });
    if (!order) {
        throw new Errors_1.NotFound("Order not found for this Paymob callback");
    }
    if (order.paymentStatus === "paid") {
        return (0, response_1.SuccessResponse)(res, {
            message: "Payment already confirmed",
            orderId: order._id,
            paymentStatus: order.paymentStatus,
        });
    }
    order.paymobTransactionId = transactionId;
    order.paymobCallbackPayload = req.body?.obj || req.query;
    if (isSuccess) {
        order.paymentStatus = "paid";
        order.status = "approved";
    }
    else {
        const session = await mongoose_1.default.startSession();
        session.startTransaction();
        try {
            if (order.paymentStatus !== "failed") {
                for (const item of order.cartItems) {
                    if (item.product && item.quantity) {
                        await products_1.ProductModel.findByIdAndUpdate(item.product, { $inc: { quantity: Number(item.quantity) } }, { session });
                    }
                }
            }
            order.paymentStatus = "failed";
            order.status = "rejected";
            await order.save({ session });
            await session.commitTransaction();
            session.endSession();
        }
        catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
        return (0, response_1.SuccessResponse)(res, {
            message: "Payment marked as failed",
            orderId: order._id,
            paymentStatus: order.paymentStatus,
        });
    }
    await order.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Payment callback processed successfully",
        orderId: order._id,
        paymentStatus: order.paymentStatus,
    });
};
exports.paymobCallback = paymobCallback;
