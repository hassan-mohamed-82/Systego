"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentMethods = void 0;
const payment_methods_1 = require("../../models/schema/admin/payment_methods");
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
exports.getPaymentMethods = (0, express_async_handler_1.default)(async (req, res) => {
    const paymentMethods = await payment_methods_1.PaymentMethodModel.find({
        isActive: { $ne: false }
    }).lean();
    if (!paymentMethods || paymentMethods.length === 0) {
        throw new NotFound_1.NotFound('No payment methods found');
    }
    (0, response_1.SuccessResponse)(res, {
        message: 'Active payment methods retrieved successfully',
        data: paymentMethods
    }, 200);
});
