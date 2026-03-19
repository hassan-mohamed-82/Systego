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
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
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
            .populate('city zone')
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
                status: 'pending'
            }], { session });
        // ز. مسح السلة بعد نجاح العملية
        await Cart_1.CartModel.findOneAndDelete({ user: userId }).session(session);
        // إنهاء العملية بنجاح
        await session.commitTransaction();
        session.endSession();
        (0, response_1.SuccessResponse)(res, { message: "Order placed successfully", order: order[0] }, 201);
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
