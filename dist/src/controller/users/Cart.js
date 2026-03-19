"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeFromCart = exports.updateQuantity = exports.getCart = exports.addToCart = void 0;
const Cart_1 = require("../../models/schema/users/Cart");
const products_1 = require("../../models/schema/admin/products");
const ShippingSettings_1 = require("../../models/schema/admin/ShippingSettings");
const Address_1 = require("../../models/schema/users/Address");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const addToCart = async (req, res) => {
    const userId = req.user?.id;
    const { productId, quantity } = req.body;
    const item = await products_1.ProductModel.findById(productId);
    if (!item) {
        throw new Errors_1.NotFound("Product not found");
    }
    let cart = await Cart_1.CartModel.findOne({ user: userId });
    let existingQuantity = 0;
    if (cart) {
        const existingItem = cart.cartItems.find(p => p.product.toString() === productId);
        if (existingItem)
            existingQuantity = existingItem.quantity;
    }
    // التأكد إن المخزن يكفي الكمية المطلوبة + الكمية اللي موجودة أصلاً في السلة
    if ((item.quantity ?? 0) < existingQuantity + quantity) {
        throw new Errors_1.BadRequest("Not enough stock available");
    }
    if (cart) {
        const existingItemIndex = cart.cartItems.findIndex(item => item.product.toString() === productId);
        if (existingItemIndex !== -1) {
            cart.cartItems[existingItemIndex].quantity += quantity;
            cart.cartItems[existingItemIndex].price = item.price || 0; // تحديث السعر
        }
        else {
            cart.cartItems.push({ product: productId, quantity, price: item.price || 0 });
        }
        await cart.save();
    }
    else {
        cart = await Cart_1.CartModel.create({
            user: userId,
            cartItems: [{ product: productId, quantity, price: item.price || 0 }],
        });
    }
    (0, response_1.SuccessResponse)(res, { message: "Cart added successfully", cart }, 201);
};
exports.addToCart = addToCart;
const getCart = async (req, res) => {
    const userId = req.user?.id;
    // استخدام findOne و populate بدلاً من تجريد البيانات
    const cart = await Cart_1.CartModel.findOne({ user: userId }).populate('cartItems.product', 'name image price price_after_discount free_shipping');
    if (!cart) {
        return (0, response_1.SuccessResponse)(res, { message: "Cart is empty", cart: { cartItems: [], totalCartPrice: 0 }, shippingCost: 0 });
    }
    // تحديث الأسعار بشكل تفاعلي لو اتغيرت في الداتابيز
    let isModified = false;
    let hasFreeShippingProduct = false;
    for (const item of cart.cartItems) {
        const product = item.product;
        if (product && product.price !== item.price) {
            item.price = product.price || 0;
            isModified = true;
        }
        if (product?.free_shipping) {
            hasFreeShippingProduct = true;
        }
    }
    if (isModified) {
        // نحدث السلة عن طريق updateOne لتجنب مشاكل الـ Populate مع Mongoose save
        const updatedItems = cart.cartItems.map(item => ({
            product: item.product._id || item.product,
            quantity: item.quantity,
            price: item.price
        }));
        await Cart_1.CartModel.updateOne({ _id: cart._id }, { $set: { cartItems: updatedItems } });
    }
    // حساب الشحن المبدئي للعرض في السلة
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
        const address = await Address_1.AddressModel.findOne({ user: userId }).populate('city zone');
        shippingCost = address ? Number(address.zone?.shipingCost || address.city?.shipingCost || 0) : 0;
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Cart fetched successfully",
        cart,
        shippingCost
    });
};
exports.getCart = getCart;
const updateQuantity = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { productId, quantity } = req.body;
    // جلب المنتج من المخزون لمعرفة المتاح والسعر 
    const item = await products_1.ProductModel.findById(productId);
    if (!item)
        throw new Errors_1.NotFound("Product not found");
    // التأكد إن الكمية المطلوبة متوفرة
    if ((item.quantity ?? 0) < quantity) {
        throw new Errors_1.BadRequest("Not enough stock available to update quantity");
    }
    const cart = await Cart_1.CartModel.findOne({ user: userId });
    if (!cart)
        throw new Errors_1.NotFound("Cart not found");
    const itemIndex = cart.cartItems.findIndex(p => p.product.toString() === productId);
    if (itemIndex === -1)
        throw new Errors_1.NotFound("Product not found in cart");
    cart.cartItems[itemIndex].quantity = quantity;
    cart.cartItems[itemIndex].price = item.price || 0; // تحديث السعر أيضاً
    await cart.save();
    (0, response_1.SuccessResponse)(res, { message: "Cart updated successfully", cart });
};
exports.updateQuantity = updateQuantity;
const removeFromCart = async (req, res) => {
    const { productId } = req.params;
    const userId = req.user?.id;
    const cart = await Cart_1.CartModel.findOneAndUpdate({ user: userId }, { $pull: { cartItems: { product: productId } } }, { new: true });
    (0, response_1.SuccessResponse)(res, { message: "Product removed from cart", cart });
};
exports.removeFromCart = removeFromCart;
const clearCart = async (req, res) => {
    const userId = req.user?.id;
    const cart = await Cart_1.CartModel.findOneAndDelete({ user: userId });
    if (!cart)
        throw new Errors_1.NotFound("Cart is already empty");
    (0, response_1.SuccessResponse)(res, { message: "Cart has been cleared successfully" });
};
exports.clearCart = clearCart;
