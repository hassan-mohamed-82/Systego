"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductById = exports.getAllProducts = void 0;
const products_1 = require("../../models/schema/admin/products");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const NotFound_1 = require("../../Errors/NotFound");
const response_1 = require("../../utils/response");
const customer_1 = require("../../models/schema/admin/POS/customer");
// 1. Get All Products (With Wishlist Status)
exports.getAllProducts = (0, express_async_handler_1.default)(async (req, res) => {
    const products = await products_1.ProductModel.find().sort({ created_at: -1 });
    let wishlistIds = [];
    if (req.user?.id) {
        const user = await customer_1.CustomerModel.findById(req.user.id).select('wishlist');
        if (user) {
            wishlistIds = user.wishlist.map(id => id.toString());
        }
    }
    const productsWithStatus = products.map(product => {
        const productObj = product.toObject();
        return {
            ...productObj,
            is_favorite: wishlistIds.includes(productObj._id.toString())
        };
    });
    return (0, response_1.SuccessResponse)(res, {
        message: 'Products retrieved successfully',
        data: productsWithStatus
    }, 200);
});
// 2. Get Product By ID (With Wishlist Status)
exports.getProductById = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const product = await products_1.ProductModel.findById(id);
    if (!product) {
        throw new NotFound_1.NotFound('Product not found');
    }
    let isFavorite = false;
    if (req.user?.id) {
        const user = await customer_1.CustomerModel.findById(req.user.id).select('wishlist');
        if (user) {
            isFavorite = user.wishlist.some(wishId => wishId.toString() === id);
        }
    }
    const productData = {
        ...product.toObject(),
        is_favorite: isFavorite
    };
    return (0, response_1.SuccessResponse)(res, {
        message: 'Product retrieved successfully',
        data: productData
    }, 200);
});
