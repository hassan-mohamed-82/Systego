"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.addToCart = exports.getCart = void 0;
const Cart_1 = require("../../models/schema/users/Cart");
const products_1 = require("../../models/schema/admin/products");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const response_1 = require("../../utils/response");
// Get user's cart
exports.getCart = (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user?.id;
    const cart = await Cart_1.Cart.findOne({ user: userId })
        .populate('cartItems.product', 'name images price stock');
    if (!cart) {
        // Return empty cart if not found
        return (0, response_1.SuccessResponse)(res, {
            message: 'Cart retrieved successfully',
            data: {
                user: userId,
                cartItems: [],
                totalCartPrice: 0
            }
        }, 200);
    }
    return (0, response_1.SuccessResponse)(res, {
        message: 'Cart retrieved successfully',
        data: cart
    }, 200);
});
// Add item to cart
exports.addToCart = (0, express_async_handler_1.default)(async (req, res) => {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user?.id;
    // Validate required fields
    if (!userId || !productId) {
        throw new BadRequest_1.BadRequest('Missing required fields: userId, productId');
    }
    // Check if product exists
    const product = await products_1.ProductsModel.findById(productId);
    if (!product) {
        throw new NotFound_1.NotFound('Product not found');
    }
    // Check stock availability
    if (product.stock_worth < quantity) {
        throw new BadRequest_1.BadRequest(`Insufficient stock. Only ${product.stock_worth} items available`);
    }
    // Find user's cart or create new one
    let cart = await Cart_1.Cart.findOne({ user: userId });
    if (!cart) {
        cart = new Cart_1.Cart({
            user: userId,
            cartItems: []
        });
    }
    // Check if product already exists in cart
    const existingItemIndex = cart.cartItems.findIndex(item => item.product.toString() === productId);
    if (existingItemIndex > -1) {
        // Update quantity if product exists
        cart.cartItems[existingItemIndex].quantity += quantity;
        cart.cartItems[existingItemIndex].price = product.price; // Update to current price
    }
    else {
        // Add new item to cart
        cart.cartItems.push({
            product: productId,
            quantity: quantity,
            price: product.price
        });
    }
    // Save cart (totalCartPrice will be calculated by pre-save hook)
    const savedCart = await cart.save();
    // Populate the cart with product details
    const populatedCart = await Cart_1.Cart.findById(savedCart._id)
        .populate('cartItems.product', 'name icon price stock_worth');
    return (0, response_1.SuccessResponse)(res, {
        message: 'Item added to cart successfully',
        data: populatedCart
    }, 200);
});
// Update cart item quantity
exports.updateCartItem = (0, express_async_handler_1.default)(async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.user?.id;
    // Validate required fields
    if (!userId || !productId || quantity === undefined) {
        throw new BadRequest_1.BadRequest('Missing required fields: userId, productId, quantity');
    }
    if (quantity < 1) {
        throw new BadRequest_1.BadRequest('Quantity must be at least 1');
    }
    // Check if product exists and has sufficient stock
    const product = await products_1.ProductsModel.findById(productId);
    if (!product) {
        throw new NotFound_1.NotFound('Product not found');
    }
    if (product.stock_worth < quantity) {
        throw new BadRequest_1.BadRequest(`Insufficient stock. Only ${product.stock_worth} items available`);
    }
    // Find user's cart
    const cart = await Cart_1.Cart.findOne({ user: userId });
    if (!cart) {
        throw new NotFound_1.NotFound('Cart not found');
    }
    // Find the item in cart
    const cartItem = cart.cartItems.find(item => item.product.toString() === productId);
    if (!cartItem) {
        throw new NotFound_1.NotFound('Item not found in cart');
    }
    // Update quantity and price
    cartItem.quantity = quantity;
    cartItem.price = product.price; // Update to current price
    const savedCart = await cart.save();
    const populatedCart = await Cart_1.Cart.findById(savedCart._id)
        .populate('cartItems.product', 'name images price stock');
    return (0, response_1.SuccessResponse)(res, {
        message: 'Cart item updated successfully',
        data: populatedCart
    }, 200);
});
// Remove item from cart
exports.removeFromCart = (0, express_async_handler_1.default)(async (req, res) => {
    const { productId } = req.body;
    const userId = req.user?.id;
    // Validate required fields
    if (!userId || !productId) {
        throw new BadRequest_1.BadRequest('Missing required fields: userId, productId');
    }
    // Find user's cart
    const cart = await Cart_1.Cart.findOne({ user: userId });
    if (!cart) {
        throw new NotFound_1.NotFound('Cart not found');
    }
    // Remove item from cart
    cart.cartItems = cart.cartItems.filter(item => item.product.toString() !== productId);
    const savedCart = await cart.save();
    const populatedCart = await Cart_1.Cart.findById(savedCart._id)
        .populate('cartItems.product', 'name images price stock');
    return (0, response_1.SuccessResponse)(res, {
        message: 'Item removed from cart successfully',
        data: populatedCart
    }, 200);
});
// Clear entire cart (delete cart document)
exports.clearCart = (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user?.id;
    const cart = await Cart_1.Cart.findOne({ user: userId });
    if (!cart) {
        throw new NotFound_1.NotFound('Cart not found');
    }
    // Delete the entire cart document
    await Cart_1.Cart.findByIdAndDelete(cart._id);
    return (0, response_1.SuccessResponse)(res, {
        message: 'Cart deleted successfully'
    }, 200);
});
