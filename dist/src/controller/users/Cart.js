"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.applyCoupon = exports.getCart = exports.syncCart = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Cart_1 = require("../../models/schema/users/Cart");
const products_1 = require("../../models/schema/admin/products");
const product_price_1 = require("../../models/schema/admin/product_price");
const ShippingSettings_1 = require("../../models/schema/admin/ShippingSettings");
const ServiceFee_1 = require("../../models/schema/admin/ServiceFee");
const coupons_1 = require("../../models/schema/admin/coupons");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const Product_Warehouse_1 = require("../../models/schema/admin/Product_Warehouse");
const Address_1 = require("../../models/schema/users/Address");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
// --- دالة مساعدة لجلب معرف السلة ---
const getCartQuery = (req) => {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || req.body?.sessionId;
    if (userId)
        return { user: userId };
    if (sessionId)
        return { sessionId: sessionId };
    throw new Errors_1.BadRequest("User ID or Session ID is required");
};
// --- دالة الحسابات المركزية ---
const calculateCartTotals = async (cart, userId) => {
    let totalCartPrice = 0;
    let totalTaxAmount = 0;
    let hasFreeShippingProduct = false;
    for (const item of cart.cartItems) {
        const product = item.product;
        const variant = item.variant;
        // جلب السعر الأحدث (بعد الخصم إن وجد)
        const currentPrice = variant ? variant.price : (product.price_after_discount || product.price || 0);
        item.price = currentPrice;
        if (product.free_shipping)
            hasFreeShippingProduct = true;
        if (product.taxesId?.status) {
            const tax = product.taxesId;
            const itemTotal = currentPrice * item.quantity;
            totalTaxAmount += tax.type === "percentage" ? (itemTotal * tax.amount) / 100 : tax.amount * item.quantity;
        }
        totalCartPrice += currentPrice * item.quantity;
    }
    const activeFees = await ServiceFee_1.ServiceFeeModel.find({ module: "online", status: true });
    let totalServiceFee = 0;
    activeFees.forEach(fee => {
        totalServiceFee += fee.type === "percentage" ? (totalCartPrice * fee.amount) / 100 : fee.amount;
    });
    const shippingSettings = await ShippingSettings_1.ShippingSettingsModel.findOne({ singletonKey: "default" });
    let shippingCost = 0;
    if (!(shippingSettings?.freeShippingEnabled || hasFreeShippingProduct)) {
        if (shippingSettings?.shippingMethod === "flat_rate") {
            shippingCost = Number(shippingSettings.flatRate || 0);
        }
        else if (userId) {
            const address = await Address_1.AddressModel.findOne({ user: userId }).populate('city zone');
            shippingCost = address ? Number(address.zone?.shipingCost || address.city?.shipingCost || 0) : 0;
        }
    }
    cart.totalCartPrice = totalCartPrice;
    cart.taxAmount = totalTaxAmount;
    cart.serviceFee = totalServiceFee;
    // --- إعادة حساب الكوبون (Coupon Recalculation) ---
    if (cart.coupon) {
        const coupon = await coupons_1.CouponModel.findById(cart.coupon);
        if (coupon && coupon.available > 0 && new Date(coupon.expired_date) > new Date()) {
            if (totalCartPrice >= (coupon.minimum_amount_for_use || 0)) {
                cart.couponDiscount = coupon.type === "percentage" ? (totalCartPrice * coupon.amount) / 100 : coupon.amount;
            }
            else {
                // إذا قل السعر عن الحد الأدنى، نحذف الكوبون
                cart.coupon = undefined;
                cart.couponDiscount = 0;
            }
        }
        else {
            // إذا انتهى الكوبون أو نفذت كميته، نحذفه
            cart.coupon = undefined;
            cart.couponDiscount = 0;
        }
    }
    return { totalCartPrice, shippingCost };
};
// 1. مزامنة السلة بالكامل (The Sync Endpoint)
exports.syncCart = (0, express_async_handler_1.default)(async (req, res) => {
    const { items } = req.body;
    const query = getCartQuery(req);
    const onlineWarehouses = await Warehouse_1.WarehouseModel.find({ Is_Online: true }).select("_id");
    const onlineWarehouseIds = onlineWarehouses.map(w => w._id);
    const validatedItems = [];
    for (const item of items) {
        const { productId, productVariantId, quantity } = item;
        const stockMatch = {
            productId: new mongoose_1.default.Types.ObjectId(productId),
            warehouseId: { $in: onlineWarehouseIds },
            productPriceId: productVariantId ? new mongoose_1.default.Types.ObjectId(productVariantId) : null
        };
        const stock = await Product_Warehouse_1.Product_WarehouseModel.aggregate([
            { $match: stockMatch },
            { $group: { _id: null, total: { $sum: "$quantity" } } }
        ]);
        const availableStock = stock[0]?.total || 0;
        if (quantity > availableStock) {
            throw new Errors_1.BadRequest(`Product ${productId} only has ${availableStock} in stock`);
        }
        let currentPrice = 0;
        if (productVariantId) {
            const variant = await product_price_1.ProductPriceModel.findById(productVariantId);
            currentPrice = variant?.price || 0;
        }
        else {
            const product = await products_1.ProductModel.findById(productId);
            currentPrice = product?.price || 0;
        }
        validatedItems.push({
            product: productId,
            variant: productVariantId || undefined,
            quantity: quantity,
            price: currentPrice
        });
    }
    // تحديث السلة
    await Cart_1.CartModel.findOneAndUpdate(query, { cartItems: validatedItems }, { upsert: true, new: true, setDefaultsOnInsert: true });
    // جلب السلة كاملة مع الحسابات (حل مشكلة fullCart is possibly null)
    const fullCart = await Cart_1.CartModel.findOne(query)
        .populate({
        path: 'cartItems.product',
        select: 'name ar_name image price price_after_discount free_shipping taxesId',
        populate: { path: 'taxesId' }
    })
        .populate('cartItems.variant');
    if (!fullCart)
        throw new Errors_1.NotFound("Cart processing failed");
    const { shippingCost } = await calculateCartTotals(fullCart, query.user);
    await fullCart.save();
    (0, response_1.SuccessResponse)(res, { message: "Cart synced successfully", cart: fullCart, shippingCost }, 200);
});
// 2. جلب السلة
exports.getCart = (0, express_async_handler_1.default)(async (req, res) => {
    const query = getCartQuery(req);
    const cart = await Cart_1.CartModel.findOne(query)
        .populate({
        path: 'cartItems.product',
        select: 'name ar_name image price price_after_discount free_shipping taxesId',
        populate: { path: 'taxesId' }
    })
        .populate('cartItems.variant');
    if (!cart || cart.cartItems.length === 0) {
        return (0, response_1.SuccessResponse)(res, { message: "Empty", cart: { cartItems: [] }, shippingCost: 0 });
    }
    const { shippingCost } = await calculateCartTotals(cart, query.user);
    await cart.save();
    (0, response_1.SuccessResponse)(res, { cart, shippingCost });
});
// 3. تطبيق كوبون
exports.applyCoupon = (0, express_async_handler_1.default)(async (req, res) => {
    const { couponCode } = req.body;
    const query = getCartQuery(req);
    const cart = await Cart_1.CartModel.findOne(query)
        .populate({ path: 'cartItems.product', populate: { path: 'taxesId' } })
        .populate('cartItems.variant');
    if (!cart)
        throw new Errors_1.NotFound("Cart is empty");
    if (!couponCode) {
        cart.coupon = undefined;
        cart.couponDiscount = 0;
        await calculateCartTotals(cart, query.user);
        await cart.save();
        return (0, response_1.SuccessResponse)(res, { message: "Coupon removed successfully", cart });
    }
    const coupon = await coupons_1.CouponModel.findOne({
        coupon_code: couponCode,
        available: { $gt: 0 },
        expired_date: { $gt: new Date() }
    });
    if (!coupon)
        throw new Errors_1.BadRequest("Invalid coupon");
    const { totalCartPrice } = await calculateCartTotals(cart, query.user);
    if (totalCartPrice < (coupon.minimum_amount_for_use || 0)) {
        throw new Errors_1.BadRequest(`Minimum order is ${coupon.minimum_amount_for_use}`);
    }
    cart.coupon = coupon._id;
    cart.couponDiscount = coupon.type === "percentage" ? (totalCartPrice * coupon.amount) / 100 : coupon.amount;
    await cart.save();
    (0, response_1.SuccessResponse)(res, { message: "Coupon applied successfully", cart });
});
// 4. مسح السلة
exports.clearCart = (0, express_async_handler_1.default)(async (req, res) => {
    await Cart_1.CartModel.findOneAndDelete(getCartQuery(req));
    (0, response_1.SuccessResponse)(res, { message: "Cart cleared" });
});
