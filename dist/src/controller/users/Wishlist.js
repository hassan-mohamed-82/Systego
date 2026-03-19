"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearWishlist = exports.checkProductInWishlist = exports.getUserWishlist = exports.toggleWishlist = void 0;
const customer_1 = require("../../models/schema/admin/POS/customer");
const products_1 = require("../../models/schema/admin/products");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const response_1 = require("../../utils/response");
const mongoose_1 = require("mongoose");
// --- 1. Toggle Product in Wishlist (Add or Remove) ---
exports.toggleWishlist = (0, express_async_handler_1.default)(async (req, res) => {
    const { productId } = req.body;
    const userId = req.user?.id;
    if (!productId)
        throw new BadRequest_1.BadRequest('Product ID is required');
    const user = await customer_1.CustomerModel.findById(userId);
    if (!user)
        throw new NotFound_1.NotFound('User not found');
    // Check if product exists in DB
    const productExists = await products_1.ProductModel.exists({ _id: productId });
    if (!productExists)
        throw new NotFound_1.NotFound('Product not found in store');
    const productObjectId = new mongoose_1.Types.ObjectId(productId);
    const isWishlisted = user.wishlist.some(id => id.toString() === productId);
    let message = "";
    if (isWishlisted) {
        // Remove if exists
        user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
        message = 'Product removed from wishlist';
    }
    else {
        // Add if not exists
        user.wishlist.push(productObjectId);
        message = 'Product added to wishlist';
    }
    await user.save();
    (0, response_1.SuccessResponse)(res, {
        message: isWishlisted ? "Product removed from wishlist successfully" : "Product added to wishlist successfully"
    }, 200);
    return;
});
// --- 2. Get User's Wishlist (Populated) ---
exports.getUserWishlist = (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user?.id;
    const user = await customer_1.CustomerModel.findById(userId)
        .populate({
        path: 'wishlist',
    });
    if (!user)
        throw new NotFound_1.NotFound('User not found');
    (0, response_1.SuccessResponse)(res, {
        message: 'Wishlist retrieved successfully',
        data: user.wishlist
    }, 200);
    return;
});
// --- 3. Check Status (For single product) ---
exports.checkProductInWishlist = (0, express_async_handler_1.default)(async (req, res) => {
    const { productId } = req.params;
    const userId = req.user?.id;
    const user = await customer_1.CustomerModel.findById(userId);
    if (!user)
        throw new NotFound_1.NotFound('User not found');
    const isInWishlist = user.wishlist.some(id => id.toString() === productId);
    (0, response_1.SuccessResponse)(res, {
        message: 'Product wishlist status retrieved',
        data: { isInWishlist, productId }
    }, 200);
    return;
});
// --- 4. Clear Entire Wishlist ---
exports.clearWishlist = (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user?.id;
    const user = await customer_1.CustomerModel.findByIdAndUpdate(userId, { $set: { wishlist: [] } }, { new: true });
    if (!user)
        throw new NotFound_1.NotFound('User not found');
    (0, response_1.SuccessResponse)(res, {
        message: 'Wishlist cleared successfully',
        data: []
    }, 200);
    return;
});
