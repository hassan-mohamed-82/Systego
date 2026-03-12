"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeFromCart = exports.updateQuantity = exports.getCart = exports.addToCart = void 0;
const Cart_1 = require("../../models/schema/users/Cart");
const products_1 = require("../../models/schema/admin/products");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const addToCart = async (req, res) => {
    const userId = req.user?.id;
    const { productId, quantity } = req.body;
    const item = await products_1.ProductModel.findById(productId);
    if (!item) {
        throw new Errors_1.NotFound("Product not found");
    }
    if ((item.quantity ?? 0) < quantity) {
        throw new Errors_1.BadRequest("Not enough stock available");
    }
    let cart = await Cart_1.CartModel.findOne({ user: userId });
    if (cart) {
        const existingItem = cart.cartItems.findIndex(item => item.product.toString() === productId);
        if (existingItem !== -1) {
            cart.cartItems[existingItem].quantity += quantity;
        }
        else {
            cart.cartItems.push({ product: productId, quantity, price: item.price });
        }
        await cart.save();
    }
    else {
        cart = await Cart_1.CartModel.create({
            user: userId,
            cartItems: [{ product: productId, quantity, price: item.price }],
        });
    }
    (0, response_1.SuccessResponse)(res, { message: "Cart added successfully", cart }, 201);
};
exports.addToCart = addToCart;
const getCart = async (req, res) => {
    const userId = req.user?.id;
    const cart = await Cart_1.CartModel.find({ user: userId })
        .populate('product', 'name');
    if (!cart) {
        return (0, response_1.SuccessResponse)(res, { message: "Cart is empty", cartItems: [], totalCartPrice: 0 });
    }
    (0, response_1.SuccessResponse)(res, { message: "Cart fetched successfully", cart });
};
exports.getCart = getCart;
const updateQuantity = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { productId, quantity } = req.body;
    const cart = await Cart_1.CartModel.findOne({ user: userId });
    if (!cart)
        throw new Errors_1.NotFound("Cart not found");
    const itemIndex = cart.cartItems.findIndex(p => p.product.toString() === productId);
    if (itemIndex === -1)
        throw new Errors_1.NotFound("Product not found in cart");
    cart.cartItems[itemIndex].quantity = quantity;
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
