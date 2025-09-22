"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePaymentMethod = exports.updatePaymentMethod = exports.getPaymentMethodById = exports.getAllPaymentMethods = exports.createPaymentMethod = void 0;
const payment_methods_1 = require("../models/schema/payment_methods");
const BadRequest_1 = require("../Errors/BadRequest");
const NotFound_1 = require("../Errors/NotFound");
const response_1 = require("../utils/response");
const handleImages_1 = require("../utils/handleImages");
const createPaymentMethod = async (req, res) => {
    const { name, discription } = req.body;
    if (!name || !discription) {
        throw new BadRequest_1.BadRequest("Please provide all the required fields");
    }
    let icon = "";
    if (icon) {
        icon = await (0, handleImages_1.saveBase64Image)(icon, Date.now().toString(), req, "payment_methods");
    }
    const paymentMethod = await payment_methods_1.PaymentMethodModel.create({
        name,
        discription,
        icon,
        isActive: true,
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Payment method created successfully",
        paymentMethod,
    });
};
exports.createPaymentMethod = createPaymentMethod;
const getAllPaymentMethods = async (req, res) => {
    const paymentMethods = await payment_methods_1.PaymentMethodModel.find();
    if (!paymentMethods)
        throw new NotFound_1.NotFound('No payment methods found');
    (0, response_1.SuccessResponse)(res, { message: 'All payment methods fetched successfully', paymentMethods });
};
exports.getAllPaymentMethods = getAllPaymentMethods;
const getPaymentMethodById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest('Please provide payment method id');
    const paymentMethod = await payment_methods_1.PaymentMethodModel.findById(id);
    if (!paymentMethod)
        throw new NotFound_1.NotFound('Payment method not found');
    (0, response_1.SuccessResponse)(res, { message: 'Payment method fetched successfully', paymentMethod });
};
exports.getPaymentMethodById = getPaymentMethodById;
const updatePaymentMethod = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("payment method id is required");
    const updateData = { ...req.body };
    if (req.body.icon) {
        updateData.icon = await (0, handleImages_1.saveBase64Image)(req.body.icon, Date.now().toString(), req, "payment_methods");
    }
    await updateData.save(); // حفظ التغييرات
    (0, response_1.SuccessResponse)(res, {
        message: "Payment method updated successfully",
        updateData
    });
};
exports.updatePaymentMethod = updatePaymentMethod;
const deletePaymentMethod = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest('Please provide payment method id');
    const paymentMethod = await payment_methods_1.PaymentMethodModel.findByIdAndDelete(id);
    if (!paymentMethod)
        throw new NotFound_1.NotFound('Payment method not found');
    (0, response_1.SuccessResponse)(res, { message: 'Payment method deleted successfully' });
};
exports.deletePaymentMethod = deletePaymentMethod;
