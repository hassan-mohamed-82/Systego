"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBanners = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const response_1 = require("../../utils/response");
const Banner_1 = require("../../models/schema/admin/Banner");
exports.getBanners = (0, express_async_handler_1.default)(async (req, res) => {
    const banners = await Banner_1.BannerModel.find({ isActive: true });
    (0, response_1.SuccessResponse)(res, {
        message: "Banners retrieved successfully",
        data: banners
    });
});
