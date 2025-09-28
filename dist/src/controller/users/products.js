"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductById = exports.getAllProduct = void 0;
const products_1 = require("../../models/schema/admin/products");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const NotFound_1 = require("../../Errors/NotFound");
const response_1 = require("../../utils/response");
exports.getAllProduct = (0, express_async_handler_1.default)(async (req, res) => {
    const products = await products_1.ProductsModel.find()
        .sort({ created_at: -1 });
    return (0, response_1.SuccessResponse)(res, { message: 'Products retrieved successfully', data: products }, 200);
});
exports.getProductById = (0, express_async_handler_1.default)(async (req, res) => {
    const id = req.params.id;
    const product = await products_1.ProductsModel.findOne({ _id: id });
    if (!product) {
        throw new NotFound_1.NotFound('Product not found');
    }
    return (0, response_1.SuccessResponse)(res, { message: 'Product retrieved successfully', data: product }, 200);
});
