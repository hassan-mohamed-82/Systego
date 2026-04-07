"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeFromCart = exports.updateQuantity = exports.getCart = exports.addToCart = void 0;
const Cart_1 = require("../../models/schema/users/Cart");
const products_1 = require("../../models/schema/admin/products");
const ShippingSettings_1 = require("../../models/schema/admin/ShippingSettings");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const Product_Warehouse_1 = require("../../models/schema/admin/Product_Warehouse");
const Address_1 = require("../../models/schema/users/Address");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const mongoose_1 = __importDefault(require("mongoose"));
// دالة مساعدة لتحديد المعرف (User أو Session)
const getCartQuery = (req) => {
    const userId = req.user?.id;
    const sessionId = req.query?.sessionId ||
        req.headers['x-session-id'] ||
        (req.body && req.body.sessionId);
    if (userId)
        return { user: userId };
    if (sessionId)
        return { sessionId: sessionId };
    throw new Errors_1.BadRequest("User ID or Session ID is required to manage cart");
};
// 1. إضافة منتج للسلة
exports.addToCart = (0, express_async_handler_1.default)(async (req, res) => {
    const { productId, quantity } = req.body;
    const query = getCartQuery(req);
    if (!mongoose_1.default.isValidObjectId(productId))
        throw new Errors_1.BadRequest("Invalid Product ID");
    const item = await products_1.ProductModel.findById(productId);
    if (!item)
        throw new Errors_1.NotFound("Product not found");
    let cart = await Cart_1.CartModel.findOne(query);
    let existingQuantity = 0;
    if (cart) {
        const existingItem = cart.cartItems.find(p => p.product.toString() === productId);
        if (existingItem)
            existingQuantity = existingItem.quantity;
    }
    // جلب المخازن الأونلاين والكمية المتاحة فيها
    const onlineWarehouses = await Warehouse_1.WarehouseModel.find({ Is_Online: true }).select("_id");
    const onlineWarehouseIds = onlineWarehouses.map((w) => w._id);
    const stockData = await Product_Warehouse_1.Product_WarehouseModel.aggregate([
        {
            $match: {
                productId: new mongoose_1.default.Types.ObjectId(productId),
                warehouseId: { $in: onlineWarehouseIds },
            },
        },
        {
            $group: {
                _id: "$productId",
                totalQuantity: { $sum: "$quantity" },
            },
        },
    ]);
    const availableStock = stockData.length > 0 ? stockData[0].totalQuantity : 0;
    if (availableStock < existingQuantity + quantity) {
        throw new Errors_1.BadRequest("Not enough stock available");
    }
    if (cart) {
        const existingItemIndex = cart.cartItems.findIndex(i => i.product.toString() === productId);
        if (existingItemIndex !== -1) {
            cart.cartItems[existingItemIndex].quantity += quantity;
            cart.cartItems[existingItemIndex].price = item.price || 0;
        }
        else {
            // استخدام as any هنا مقبول مع الحفظ الذكي
            cart.cartItems.push({ product: productId, quantity, price: item.price || 0 });
        }
        await cart.save();
    }
    else {
        // الحل الذكي: التأكد من أنواع البيانات عند الإنشاء لأول مرة
        cart = await Cart_1.CartModel.create({
            ...query,
            cartItems: [{ product: new mongoose_1.default.Types.ObjectId(productId), quantity, price: item.price || 0 }],
        });
    }
    (0, response_1.SuccessResponse)(res, { message: "Cart updated successfully", cart }, 201);
});
// 2. جلب بيانات السلة وحساب الشحن
exports.getCart = (0, express_async_handler_1.default)(async (req, res) => {
    const query = getCartQuery(req);
    const userId = query.user;
    const cart = await Cart_1.CartModel.findOne(query).populate('cartItems.product', 'name image price price_after_discount free_shipping');
    if (!cart) {
        return (0, response_1.SuccessResponse)(res, {
            message: "Cart is empty",
            cart: { cartItems: [], totalCartPrice: 0 },
            shippingCost: 0
        });
    }
    let isModified = false;
    let hasFreeShippingProduct = false;
    for (const item of cart.cartItems) {
        const product = item.product;
        if (product && product.price !== item.price) {
            item.price = product.price || 0;
            isModified = true;
        }
        if (product?.free_shipping)
            hasFreeShippingProduct = true;
    }
    // هنا الـ "تعديل الذكي" لضمان عدم حدوث Error الـ Populate
    if (isModified) {
        // بنستخدم markModified عشان نقول لمونجوس إن الـ Array اللي جواها Objects اتغيرت
        cart.markModified('cartItems');
        await cart.save();
    }
    const shippingSettings = await ShippingSettings_1.ShippingSettingsModel.findOne({ singletonKey: "default" });
    const selectedMethod = shippingSettings?.shippingMethod || "zone";
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
        if (userId) {
            const address = await Address_1.AddressModel.findOne({ user: userId }).populate('city zone');
            shippingCost = address ? Number(address.zone?.shipingCost || address.city?.shipingCost || 0) : 0;
        }
        else {
            shippingCost = 0;
        }
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Cart fetched successfully",
        cart,
        shippingCost
    });
});
// 3. تحديث الكمية
exports.updateQuantity = (0, express_async_handler_1.default)(async (req, res) => {
    const { productId, quantity } = req.body;
    const query = getCartQuery(req);
    const item = await products_1.ProductModel.findById(productId);
    if (!item)
        throw new Errors_1.NotFound("Product not found");
    // جلب المخازن الأونلاين والكمية المتاحة فيها
    const onlineWarehouses = await Warehouse_1.WarehouseModel.find({ Is_Online: true }).select("_id");
    const onlineWarehouseIds = onlineWarehouses.map((w) => w._id);
    const stockData = await Product_Warehouse_1.Product_WarehouseModel.aggregate([
        {
            $match: {
                productId: new mongoose_1.default.Types.ObjectId(productId),
                warehouseId: { $in: onlineWarehouseIds },
            },
        },
        {
            $group: {
                _id: "$productId",
                totalQuantity: { $sum: "$quantity" },
            },
        },
    ]);
    const availableStock = stockData.length > 0 ? stockData[0].totalQuantity : 0;
    if (availableStock < quantity) {
        throw new Errors_1.BadRequest("Not enough stock available");
    }
    const cart = await Cart_1.CartModel.findOne(query);
    if (!cart)
        throw new Errors_1.NotFound("Cart not found");
    const itemIndex = cart.cartItems.findIndex(p => p.product.toString() === productId);
    if (itemIndex === -1)
        throw new Errors_1.NotFound("Product not in cart");
    cart.cartItems[itemIndex].quantity = quantity;
    cart.cartItems[itemIndex].price = item.price || 0;
    cart.markModified('cartItems'); // تأكيد التعديل
    await cart.save();
    (0, response_1.SuccessResponse)(res, { message: "Quantity updated", cart });
});
// 4. حذف منتج (تم استخدام findOneAndUpdate لضمان السرعة)
exports.removeFromCart = (0, express_async_handler_1.default)(async (req, res) => {
    const { productId } = req.params;
    const query = getCartQuery(req);
    const cart = await Cart_1.CartModel.findOneAndUpdate(query, { $pull: { cartItems: { product: productId } } }, { new: true });
    (0, response_1.SuccessResponse)(res, { message: "Product removed from cart", cart });
});
// 5. مسح السلة
exports.clearCart = (0, express_async_handler_1.default)(async (req, res) => {
    const query = getCartQuery(req);
    const cart = await Cart_1.CartModel.findOneAndDelete(query);
    if (!cart)
        throw new Errors_1.NotFound("Cart is empty");
    (0, response_1.SuccessResponse)(res, { message: "Cart has been cleared successfully" });
});
