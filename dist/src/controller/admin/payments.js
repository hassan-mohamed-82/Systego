"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatepayment = exports.getpaymentById = exports.getpayments = void 0;
const payment_1 = require("../../models/schema/admin/POS/payment");
const NotFound_1 = require("../../Errors/NotFound");
const unauthorizedError_1 = require("../../Errors/unauthorizedError");
const response_1 = require("../../utils/response");
const getpayments = async (req, res) => {
    const pending_payments = await payment_1.PaymentModel.find({ status: "pending" });
    const completed_payments = await payment_1.PaymentModel.find({ status: "completed" });
    const failed_payments = await payment_1.PaymentModel.find({ status: "failed" });
    (0, response_1.SuccessResponse)(res, { message: "payments retrieved successfully", pending_payments, completed_payments, failed_payments });
};
exports.getpayments = getpayments;
const getpaymentById = async (req, res) => {
    const { id } = req.params;
    const payment = await payment_1.PaymentModel.findById(id);
    if (!payment)
        throw new NotFound_1.NotFound("payment not found");
    (0, response_1.SuccessResponse)(res, { message: "payment retrieved successfully", payment });
};
exports.getpaymentById = getpaymentById;
const updatepayment = async (req, res) => {
    const { id } = req.params;
    const status = req.body;
    const payment = await payment_1.PaymentModel.findById(id);
    if (!payment)
        throw new NotFound_1.NotFound("payment not found");
    if (payment.status !== "pending")
        throw new unauthorizedError_1.UnauthorizedError("you can't update this payment");
    if (status === "completed" || status === "failed") {
        payment.status = status;
        await payment.save();
    }
    (0, response_1.SuccessResponse)(res, { message: "payment updated successfully" });
};
exports.updatepayment = updatepayment;
