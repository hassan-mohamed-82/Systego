"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearWishlist = exports.checkProductInWishlist = exports.getUserWishlist = exports.removeProductFromWishlist = exports.addProductToWishlist = void 0;
const platformUser_1 = require("../../models/schema/users/platformUser");
const products_1 = require("../../models/schema/admin/products");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const response_1 = require("../../utils/response");
const mongoose_1 = require("mongoose");
// Add product to user's wishlist
exports.addProductToWishlist = (0, express_async_handler_1.default)(async (req, res) => {
    const { productId } = req.body;
    const userId = req.user?.id;
    // Validate required fields
    if (!userId || !productId) {
        throw new BadRequest_1.BadRequest('Missing required fields: userId, productId');
    }
    // Check if user exists
    const user = await platformUser_1.Platform_User.findById(userId);
    if (!user) {
        throw new NotFound_1.NotFound('User not found');
    }
    // Check if product exists
    const product = await products_1.ProductModel.findById(productId);
    if (!product) {
        throw new NotFound_1.NotFound('Product not found');
    }
    // Check if product is already in wishlist
    if (user.wishlist.includes(productId)) {
        throw new BadRequest_1.BadRequest('Product already in wishlist');
    }
    // Add product to wishlist
    user.wishlist.push(productId);
    const updatedUser = await user.save();
    // Populate wishlist with product details
    const populatedUser = await platformUser_1.Platform_User.findById(updatedUser._id)
        .populate('wishlist', 'name images price stock category');
    return (0, response_1.SuccessResponse)(res, {
        message: 'Product added to wishlist successfully',
        data: populatedUser?.wishlist ?? [] // Use optional chaining and provide a default value if populatedUser is null
    }, 200);
});
// Remove product from user's wishlist
exports.removeProductFromWishlist = (0, express_async_handler_1.default)(async (req, res) => {
    const { productId } = req.body;
    const userId = req.user?.id;
    // Validate required fields
    if (!userId || !productId) {
        throw new BadRequest_1.BadRequest('Missing required fields: userId, productId');
    }
    // Check if user exists
    const user = await platformUser_1.Platform_User.findById(userId);
    if (!user) {
        throw new NotFound_1.NotFound('User not found');
    }
    // Check if product exists in wishlist
    if (!user.wishlist.includes(productId)) {
        throw new NotFound_1.NotFound('Product not found in wishlist');
    }
    // Remove product from wishlist
    user.wishlist = user.wishlist.filter(item => item.toString() !== productId);
    const updatedUser = await user.save();
    // Populate wishlist with product details
    const populatedUser = await platformUser_1.Platform_User.findById(updatedUser._id)
        .populate('wishlist', 'name images price stock category');
    return (0, response_1.SuccessResponse)(res, {
        message: 'Product removed from wishlist successfully',
        data: populatedUser?.wishlist ?? [] // Use optional chaining and provide a default value if populatedUser is null
    }, 200);
});
// Get user's wishlist
exports.getUserWishlist = (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user?.id;
    // Validate required field
    if (!userId) {
        throw new BadRequest_1.BadRequest('User ID is required');
    }
    // Check if user exists and populate wishlist
    const user = await platformUser_1.Platform_User.findById(userId)
        .populate('wishlist', 'name images price stock category discount');
    if (!user) {
        throw new NotFound_1.NotFound('User not found');
    }
    return (0, response_1.SuccessResponse)(res, {
        message: 'Wishlist retrieved successfully',
        data: user.wishlist
    }, 200);
});
// Check if product is in user's wishlist
exports.checkProductInWishlist = (0, express_async_handler_1.default)(async (req, res) => {
    const { productId } = req.params;
    const userId = req.user?.id;
    // Validate required fields
    if (!userId || !productId) {
        throw new BadRequest_1.BadRequest('Missing required fields: userId, productId');
    }
    // Check if user exists
    const user = await platformUser_1.Platform_User.findById(userId);
    if (!user) {
        throw new NotFound_1.NotFound('User not found');
    }
    // Check if product exists in wishlist
    const isInWishlist = user.wishlist.includes(new mongoose_1.Types.ObjectId(productId));
    return (0, response_1.SuccessResponse)(res, {
        message: 'Product wishlist status retrieved successfully',
        data: { isInWishlist, productId }
    }, 200);
});
// Clear user's entire wishlist
exports.clearWishlist = (0, express_async_handler_1.default)(async (req, res) => {
    const userId = req.user?.id;
    // Validate required field
    if (!userId) {
        throw new BadRequest_1.BadRequest('User ID is required');
    }
    // Check if user exists
    const user = await platformUser_1.Platform_User.findById(userId);
    if (!user) {
        throw new NotFound_1.NotFound('User not found');
    }
    // Clear wishlist
    user.wishlist = [];
    const updatedUser = await user.save();
    return (0, response_1.SuccessResponse)(res, {
        message: 'Wishlist cleared successfully',
        data: updatedUser.wishlist
    }, 200);
});
