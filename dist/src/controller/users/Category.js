"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryById = exports.getAllCategorys = void 0;
const category_1 = require("../../models/schema/admin/category");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const NotFound_1 = require("../../Errors/NotFound");
const response_1 = require("../../utils/response");
exports.getAllCategorys = (0, express_async_handler_1.default)(async (req, res) => {
    const categories = await category_1.CategoryModel.find()
        .sort({ created_at: -1 });
    return (0, response_1.SuccessResponse)(res, { message: 'Categorys retrieved successfully', data: categories }, 200);
});
exports.getCategoryById = (0, express_async_handler_1.default)(async (req, res) => {
    const id = req.params.id;
    const category = await category_1.CategoryModel.findOne({ _id: id });
    if (!category) {
        throw new NotFound_1.NotFound('Category not found');
    }
    return (0, response_1.SuccessResponse)(res, { message: 'Category retrieved successfully', data: category }, 200);
});
