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
        // ب. التأكد من وجود العنوان وجلب بيانات الشحن منه (Populate Zone)
        const address = await Address_1.AddressModel.findOne({ _id: shippingAddress, user: userId })
            .populate('city zone')
            .session(session);
        if (!address)
            throw new Errors_1.NotFound("Shipping address not found");
        // ج. حساب تكلفة الشحن (بناءً على النقاش السابق: الأولوية للزون ثم المدينة)
        const shippingCost = address.zone?.shippingCost || address.city?.shippingCost || 0;
        const finalTotalPrice = cart.totalCartPrice + shippingCost;
        // د. تحديث المخزن لكل منتج في السلة
        for (const item of cart.cartItems) {
            const product = await products_1.ProductModel.findById(item.product).session(session);
            const requestedQuantity = item.quantity ?? 1;
            if (!product || product.quantity == null || product.quantity < requestedQuantity) {
                throw new Errors_1.BadRequest(`Product ${product?.name || 'unknown'} is out of stock or insufficient`);
            }
            // خصم الكمية من المخزن
            product.quantity -= requestedQuantity;
            await product.save({ session });
        }
        // هـ. إنشاء الأوردر (أخذ لقطة Snapshot من البيانات الحالية)
        const order = await Order_1.OrderModel.create([{
                user: userId,
                cartItems: cart.cartItems, // تخزين المنتجات بأسعارها وقت الشراء
                shippingAddress: {
                    details: `${address.street}, Bldg ${address.buildingNumber}`,
                    city: address.city.name,
                    zone: address.zone.name,
                },
                shippingPrice: shippingCost,
                totalPrice: finalTotalPrice,
                paymentMethod,
                proofImage,
                status: 'pending'
            }], { session });
        // و. مسح السلة بعد نجاح العملية
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
        .sort({ createdAt: -1 });
    (0, response_1.SuccessResponse)(res, { orders });
};
exports.getMyOrders = getMyOrders;
const getOrderDetails = async (req, res) => {
    const { id } = req.params;
    const order = await Order_1.OrderModel.findOne({ _id: id, user: req.user?.id })
        .populate('cartItems.product', 'name image');
    if (!order)
        throw new Errors_1.NotFound("Order not found");
    (0, response_1.SuccessResponse)(res, { order });
};
exports.getOrderDetails = getOrderDetails;
