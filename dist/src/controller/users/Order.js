"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderDetails = exports.getMyOrders = exports.createOrder = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
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
const paymobService_1 = require("../../utils/paymobService");
const City_1 = require("../../models/schema/admin/City");
const Zone_1 = require("../../models/schema/admin/Zone");
// ===============================
// 🟢 CREATE ORDER
// ===============================
const createOrder = async (req, res) => {
    const userId = req.user?.id;
    const sessionId = req.headers["x-session-id"];
    const { shippingAddress, paymentMethod, proofImage } = req.body;
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        // 1️⃣ تحديد السلة (Cart)
        if (!userId && !sessionId) {
            throw new Errors_1.BadRequest("User ID or Session ID is required to find your cart");
        }
        const cartQuery = userId ? { user: userId } : { sessionId: sessionId };
        const cart = await Cart_1.CartModel.findOne(cartQuery).session(session);
        if (!cart || cart.cartItems.length === 0) {
            throw new Errors_1.BadRequest("Cart is empty");
        }
        // 2️⃣ Payment Method
        const paymentMethodDoc = await payment_methods_1.PaymentMethodModel.findOne({
            _id: paymentMethod,
            isActive: { $ne: false },
        }).session(session);
        if (!paymentMethodDoc)
            throw new Errors_1.BadRequest("Invalid payment method");
        if (paymentMethodDoc.type === "manual" && !proofImage) {
            throw new Errors_1.BadRequest("Proof image required for manual payment");
        }
        // 3️⃣ Hybrid Address Logic
        let shippingAddressData;
        let shippingCost = 0;
        let rawAddressForPaymob;
        if (typeof shippingAddress === "string") {
            // Registered user (ID): populate to get names and prices
            const addressDoc = await Address_1.AddressModel.findOne({
                _id: shippingAddress,
                user: userId
            })
                .populate("city zone country")
                .session(session);
            if (!addressDoc)
                throw new Errors_1.NotFound("Address not found");
            const populated = addressDoc;
            shippingAddressData = {
                details: `${populated.street}`,
                city: populated.city?.name || "",
                zone: populated.zone?.name || "",
            };
            shippingCost = Number(populated.zone?.shipingCost || populated.city?.shipingCost || 0);
            rawAddressForPaymob = populated;
        }
        else {
            // حالة الضيف (Object): نجلب الموديلات يدوياً لحساب الشحن بدقة
            const [cityDoc, zoneDoc] = await Promise.all([
                City_1.CityModels.findById(shippingAddress.city).session(session),
                Zone_1.ZoneModel.findById(shippingAddress.zone).session(session)
            ]);
            shippingAddressData = {
                details: `${shippingAddress.street}`,
                city: cityDoc?.name || "",
                zone: zoneDoc?.name || "",
            };
            shippingCost = Number(zoneDoc?.shipingCost || cityDoc?.shipingCost || 0);
            rawAddressForPaymob = shippingAddress;
        }
        // 4️⃣ Shipping Settings
        const productIds = cart.cartItems.map((i) => i.product);
        const freeShippingProductsCount = await products_1.ProductModel.countDocuments({
            _id: { $in: productIds },
            free_shipping: true,
        }).session(session);
        const shippingSettings = await ShippingSettings_1.ShippingSettingsModel.findOne({
            singletonKey: "default",
        }).session(session);
        if (shippingSettings?.freeShippingEnabled || freeShippingProductsCount > 0) {
            shippingCost = 0;
        }
        else if (shippingSettings?.shippingMethod === "flat_rate") {
            shippingCost = Number(shippingSettings.flatRate || 0);
        }
        else {
            shippingCost =
                Number(rawAddressForPaymob.zone?.shipingCost) ||
                    Number(rawAddressForPaymob.city?.shipingCost) ||
                    0;
        }
        // 5️⃣ Products & Stock
        let productsTotal = 0;
        const finalItems = [];
        for (const item of cart.cartItems) {
            const qty = item.quantity ?? 1;
            const product = await products_1.ProductModel.findOneAndUpdate({ _id: item.product, quantity: { $gte: qty } }, { $inc: { quantity: -qty } }, { new: true, session });
            if (!product)
                throw new Errors_1.BadRequest(`Product ${item.product} is out of stock`);
            const price = product.price || 0;
            productsTotal += price * qty;
            finalItems.push({
                product: product._id.toString(),
                quantity: qty,
                price,
            });
        }
        const totalPrice = productsTotal + shippingCost;
        // 6️⃣ Create Order
        const order = await Order_1.OrderModel.create([
            {
                user: userId || null,
                cartItems: finalItems,
                shippingAddress: shippingAddressData,
                shippingPrice: shippingCost,
                totalOrderPrice: totalPrice,
                paymentMethod: paymentMethod.toString(),
                proofImage,
                status: "pending",
                paymentGateway: paymentMethodDoc.type === "automatic" ? "paymob" : "manual",
                paymentStatus: paymentMethodDoc.type === "automatic" ? "pending" : "unpaid",
            },
        ], { session });
        let paymobData = null;
        // ===============================
        // 🟢 PAYMOB INTEGRATION
        // ===============================
        if (paymentMethodDoc.type === "automatic") {
            const paymobConfig = await Paymob_1.PaymobModel.findOne({
                payment_method_id: paymentMethodDoc._id,
                isActive: true,
            }).session(session);
            if (!paymobConfig)
                throw new Errors_1.BadRequest("Paymob not configured");
            // للضيوف: نحاول نجيب بيانات العميل لو موجود أو نستخدم بيانات افتراضية
            const customer = userId ? await customer_1.CustomerModel.findById(userId).session(session) : null;
            const authToken = await paymobService_1.PaymobService.getAuthToken(paymobConfig.api_key);
            const amountCents = Math.round(totalPrice * 100);
            const paymobOrderId = await paymobService_1.PaymobService.createOrder(authToken, amountCents, order[0]._id.toString());
            const billingData = {
                first_name: customer?.name || "Guest",
                last_name: "Customer",
                email: customer?.email || "guest@systego.com",
                phone_number: customer?.phone_number || "01000000000",
                apartment: rawAddressForPaymob.apartmentNumber || "NA",
                floor: rawAddressForPaymob.floorNumber || "NA",
                street: shippingAddressData.details || "NA",
                building: rawAddressForPaymob.buildingNumber || "NA",
                shipping_method: "NA",
                postal_code: "NA",
                city: shippingAddressData.city || "Cairo",
                country: "EG",
                state: shippingAddressData.zone || "NA",
            };
            const paymentToken = await paymobService_1.PaymobService.generatePaymentKey(authToken, amountCents, paymobOrderId, Number(paymobConfig.integration_id), billingData);
            const iframeUrl = paymobService_1.PaymobService.getIframeUrl(paymobConfig.iframe_id, paymentToken);
            order[0].paymobOrderId = String(paymobOrderId);
            order[0].paymobIframeUrl = iframeUrl;
            await order[0].save({ session });
            paymobData = {
                paymobOrderId: String(paymobOrderId),
                iframeUrl,
            };
        }
        // 7️⃣ Clear cart
        await Cart_1.CartModel.findOneAndDelete(cartQuery).session(session);
        await session.commitTransaction();
        session.endSession();
        return (0, response_1.SuccessResponse)(res, {
            message: "Order created successfully",
            order: order[0],
            payment: paymobData,
        }, 201);
    }
    catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
    }
};
exports.createOrder = createOrder;
// ===============================
// 🟢 GET MY ORDERS
// ===============================
const getMyOrders = async (req, res) => {
    const orders = await Order_1.OrderModel.find({ user: req.user?.id })
        .populate("paymentMethod", "name ar_name")
        .sort({ createdAt: -1 });
    (0, response_1.SuccessResponse)(res, { orders });
};
exports.getMyOrders = getMyOrders;
// ===============================
// 🟢 ORDER DETAILS
// ===============================
const getOrderDetails = async (req, res) => {
    const order = await Order_1.OrderModel.findOne({
        _id: req.params.id,
        user: req.user?.id,
    })
        .populate("cartItems.product", "name image")
        .populate("paymentMethod", "name ar_name");
    if (!order)
        throw new Errors_1.NotFound("Order not found");
    (0, response_1.SuccessResponse)(res, { order });
};
exports.getOrderDetails = getOrderDetails;
