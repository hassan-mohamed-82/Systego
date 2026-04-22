"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPaymobPaymentStatus = exports.getOrderDetails = exports.getMyOrders = exports.createOrder = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Cart_1 = require("../../models/schema/users/Cart");
const Order_1 = require("../../models/schema/users/Order");
const products_1 = require("../../models/schema/admin/products");
const Product_Warehouse_1 = require("../../models/schema/admin/Product_Warehouse");
const Address_1 = require("../../models/schema/users/Address");
const ShippingSettings_1 = require("../../models/schema/admin/ShippingSettings");
const payment_methods_1 = require("../../models/schema/admin/payment_methods");
const Paymob_1 = require("../../models/schema/admin/Paymob");
const Geidea_1 = require("../../models/schema/admin/Geidea");
const customer_1 = require("../../models/schema/admin/POS/customer");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const paymobService_1 = require("../../utils/paymobService");
const geadiaService_1 = require("../../utils/geadiaService");
const City_1 = require("../../models/schema/admin/City");
const Zone_1 = require("../../models/schema/admin/Zone");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const Fawry_1 = require("../../models/schema/admin/Fawry");
const fawryService_1 = require("../../utils/fawryService");
// ===============================
// 🟢 CREATE ORDER
const createOrder = async (req, res) => {
    const userId = req.user?.id;
    const sessionId = req.headers["x-session-id"];
    const { shippingAddress, paymentMethod, proofImage, orderType = "delivery", warehouseId } = req.body;
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    let isTransactionCommitted = false;
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
        // 3️⃣ Address / Warehouse Logic based on orderType
        let shippingAddressData = null;
        let shippingCost = 0;
        let rawAddressForPaymob = {};
        let resolvedWarehouseId = null;
        if (!orderType)
            throw new Errors_1.BadRequest("orderType is required");
        if (orderType !== "pickup" && orderType !== "delivery")
            throw new Errors_1.BadRequest("Invalid orderType");
        if (orderType === "pickup") {
            // PICKUP: require a warehouseId
            if (!warehouseId)
                throw new Errors_1.BadRequest("warehouseId is required for pickup orders");
            const warehouse = await Warehouse_1.WarehouseModel.findOne({ _id: warehouseId, Is_Online: true }).session(session);
            if (!warehouse)
                throw new Errors_1.NotFound("Warehouse not found or not available");
            resolvedWarehouseId = warehouse._id;
            shippingCost = 0; // no shipping for pickup
        }
        else {
            // DELIVERY: require a shippingAddress
            if (!shippingAddress)
                throw new Errors_1.BadRequest("shippingAddress is required for delivery orders");
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
        }
        // 5️⃣ Products & Stock
        let productsTotal = 0;
        const finalItems = [];
        // تحديد مخزن الأونلاين للطلبات الـ delivery لو مش معروف
        if (orderType === "delivery" && !resolvedWarehouseId) {
            const onlineWarehouse = await Warehouse_1.WarehouseModel.findOne({ Is_Online: true }).session(session);
            if (!onlineWarehouse)
                throw new Errors_1.BadRequest("No online warehouse available for delivery");
            resolvedWarehouseId = onlineWarehouse._id;
        }
        for (const item of cart.cartItems) {
            const qty = item.quantity ?? 1;
            // خصم من مخزن الأونلاين (Product_Warehouse)
            const warehouseStock = await Product_Warehouse_1.Product_WarehouseModel.findOneAndUpdate({
                productId: item.product,
                warehouseId: resolvedWarehouseId,
                quantity: { $gte: qty }
            }, { $inc: { quantity: -qty } }, { new: true, session });
            if (!warehouseStock)
                throw new Errors_1.BadRequest(`Product ${item.product} is out of stock in the selected warehouse`);
            // تحديث الكمية الإجمالية في موديل المنتج (اختياري للمزامنة)
            const product = await products_1.ProductModel.findByIdAndUpdate(item.product, { $inc: { quantity: -qty } }, { new: true, session });
            if (!product)
                throw new Errors_1.BadRequest(`Product ${item.product} not found`);
            const price = product.price || 0;
            productsTotal += price * qty;
            finalItems.push({
                product: product._id.toString(),
                quantity: qty,
                price,
            });
        }
        const totalPrice = productsTotal + shippingCost;
        // جلب إعدادات بوابات الدفع
        const geideaConfig = paymentMethodDoc.type === "automatic"
            ? await Geidea_1.GeideaModel.findOne({ payment_method_id: paymentMethodDoc._id, isActive: true }).session(session) : null;
        const paymobConfig = paymentMethodDoc.type === "automatic"
            ? await Paymob_1.PaymobModel.findOne({ payment_method_id: paymentMethodDoc._id, isActive: true }).session(session) : null;
        const fawryConfig = paymentMethodDoc.type === "automatic"
            ? await Fawry_1.FawryModel.findOne({ payment_method_id: paymentMethodDoc._id, isActive: true }).session(session) : null;
        let paymentGateway = "manual";
        if (paymentMethodDoc.type === "automatic") {
            if (geideaConfig)
                paymentGateway = "geidea";
            else if (paymobConfig)
                paymentGateway = "paymob";
            else if (fawryConfig)
                paymentGateway = "fawry";
            else
                throw new Errors_1.BadRequest("No active automatic gateway config found for selected payment method");
        }
        // 6️⃣ Create Order
        const order = await Order_1.OrderModel.create([
            {
                user: userId || null,
                orderType,
                warehouse: resolvedWarehouseId || undefined,
                cartItems: finalItems,
                shippingAddress: shippingAddressData,
                shippingPrice: shippingCost,
                totalOrderPrice: totalPrice,
                paymentMethod: paymentMethod.toString(),
                proofImage,
                status: "pending",
                paymentGateway,
                paymentStatus: paymentMethodDoc.type === "automatic" ? "pending" : "unpaid",
            },
        ], { session });
        let paymentData = null;
        let shouldClearCart = true;
        // ===============================
        // 🟢 PAYMENT INTEGRATIONS
        // ===============================
        if (paymentGateway !== "manual") {
            try {
                const customer = userId ? await customer_1.CustomerModel.findById(userId).session(session) : null;
                if (paymentGateway === "paymob") {
                    if (!paymobConfig)
                        throw new Errors_1.BadRequest("Paymob not configured");
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
                    paymentData = { paymobOrderId: String(paymobOrderId), iframeUrl };
                }
                else if (paymentGateway === "geidea") {
                    if (!geideaConfig)
                        throw new Errors_1.BadRequest("Geidea not configured");
                    const geideaPayment = await (0, geadiaService_1.initializeGeideaPayment)({
                        localOrderId: order[0]._id.toString(),
                        amount: totalPrice,
                        geideaConfig: { publicKey: geideaConfig.publicKey, apiPassword: geideaConfig.apiPassword },
                        customer,
                        address: rawAddressForPaymob,
                    });
                    order[0].geideaSessionId = geideaPayment.geideaSessionId;
                    await order[0].save({ session });
                    paymentData = { geideaSessionId: geideaPayment.geideaSessionId, iframeUrl: geideaPayment.iframeUrl };
                }
                else if (paymentGateway === "fawry") {
                    if (!fawryConfig)
                        throw new Errors_1.BadRequest("Fawry not configured");
                    const fawryItems = finalItems.map(item => ({
                        itemId: item.product.toString(),
                        description: "Product",
                        price: item.price,
                        quantity: item.quantity
                    }));
                    if (shippingCost > 0) {
                        fawryItems.push({ itemId: "SHIPPING", description: "Shipping Fees", price: shippingCost, quantity: 1 });
                    }
                    const fawryPayment = await fawryService_1.FawryService.createChargeRequest({
                        merchantCode: fawryConfig.merchantCode,
                        secureKey: fawryConfig.secureKey,
                        merchantRefNum: order[0]._id.toString(),
                        customerProfileId: userId?.toString() || "guest",
                        customerName: customer?.name || "Guest Customer",
                        customerMobile: customer?.phone_number || "01000000000",
                        customerEmail: customer?.email || "guest@systego.com",
                        amount: totalPrice,
                        returnUrl: process.env.FAWRY_RETURN_URL || "https://bcknd.systego.net/api/payment/success",
                        items: fawryItems,
                        isSandbox: fawryConfig.sandboxMode
                    });
                    order[0].fawryReferenceId = fawryPayment.referenceNumber;
                    await order[0].save({ session });
                    paymentData = {
                        referenceNumber: fawryPayment.referenceNumber,
                        iframeUrl: fawryPayment.nextAction?.redirectUrl || null,
                    };
                }
            }
            catch (gatewayError) {
                // إرجاع الكميات للمخزن في حالة فشل البوابة
                for (const item of finalItems) {
                    await Product_Warehouse_1.Product_WarehouseModel.updateOne({ productId: item.product, warehouseId: resolvedWarehouseId }, { $inc: { quantity: item.quantity } }, { session });
                    await products_1.ProductModel.updateOne({ _id: item.product }, { $inc: { quantity: item.quantity } }, { session });
                }
                order[0].status = "rejected";
                order[0].paymentStatus = "failed";
                if (paymentGateway === "paymob") {
                    order[0].paymobCallbackPayload = { paymentInitError: gatewayError?.message || "Payment initialization failed" };
                }
                else if (paymentGateway === "geidea") {
                    order[0].geideaCallbackPayload = { paymentInitError: gatewayError?.message || "Payment initialization failed" };
                    order[0].markModified("geideaCallbackPayload");
                }
                else if (paymentGateway === "fawry") {
                    order[0].fawryCallbackPayload = { paymentInitError: gatewayError?.message || "Payment initialization failed" };
                    order[0].markModified("fawryCallbackPayload");
                }
                await order[0].save({ session });
                shouldClearCart = false;
                await session.commitTransaction();
                isTransactionCommitted = true;
                session.endSession();
                throw new Errors_1.BadRequest(gatewayError?.message || "Payment failed. Order marked as rejected");
            }
        }
        // 7️⃣ Clear cart
        if (shouldClearCart) {
            await Cart_1.CartModel.findOneAndDelete(cartQuery).session(session);
        }
        await session.commitTransaction();
        isTransactionCommitted = true;
        session.endSession();
        return (0, response_1.SuccessResponse)(res, {
            message: "Order created successfully",
            order: order[0],
            payment: paymentData,
        }, 201);
    }
    catch (err) {
        if (!isTransactionCommitted) {
            await session.abortTransaction();
            session.endSession();
        }
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
        .populate("warehouse", "name")
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
        .populate("paymentMethod", "name ar_name")
        .populate("warehouse", "name");
    if (!order)
        throw new Errors_1.NotFound("Order not found");
    (0, response_1.SuccessResponse)(res, { order });
};
exports.getOrderDetails = getOrderDetails;
// ===============================
// 🟢 VERIFY PAYMOB PAYMENT STATUS
// ===============================
const verifyPaymobPaymentStatus = async (req, res) => {
    const { orderId } = req.params;
    const userId = req.user?.id;
    const order = await Order_1.OrderModel.findOne({
        _id: orderId,
        user: userId,
    });
    if (!order)
        throw new Errors_1.NotFound("Order not found");
    if (order.paymentGateway !== "paymob") {
        throw new Errors_1.BadRequest("Order is not a Paymob order");
    }
    if (!order.paymobOrderId) {
        throw new Errors_1.BadRequest("Order does not have a Paymob transaction");
    }
    try {
        const paymobConfig = await Paymob_1.PaymobModel.findOne({
            isActive: true,
        });
        if (!paymobConfig) {
            throw new Errors_1.BadRequest("Paymob configuration not found");
        }
        // Get auth token and fetch transactions
        const authToken = await paymobService_1.PaymobService.getAuthToken(paymobConfig.api_key);
        const transactions = await paymobService_1.PaymobService.getOrderTransactions(authToken, Number(order.paymobOrderId));
        const status = paymobService_1.PaymobService.getLatestTransactionStatus(transactions);
        // If payment was successful and order status is still pending, update it
        if (status.success && order.status === "pending") {
            order.status = "approved";
            order.paymentStatus = "paid";
            order.paymobTransactionId = String(status.transactionId);
            order.paymobCallbackPayload = status;
            await order.save();
        }
        // If payment failed or voided and order status is still pending, mark as rejected
        else if ((!status.success || status.isVoided) &&
            order.status === "pending") {
            order.status = "rejected";
            order.paymentStatus = "failed";
            order.paymobCallbackPayload = status;
            await order.save();
        }
        return (0, response_1.SuccessResponse)(res, {
            orderId: order._id,
            currentStatus: order.status,
            paymentStatus: order.paymentStatus,
            paymobStatus: status,
            updated: true,
        });
    }
    catch (error) {
        throw new Errors_1.BadRequest(`Failed to verify payment: ${error.message}`);
    }
};
exports.verifyPaymobPaymentStatus = verifyPaymobPaymentStatus;
