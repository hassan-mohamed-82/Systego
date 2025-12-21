"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePaymentMethod = exports.updatePaymentMethod = exports.createPaymentMethod = exports.getPaymentMethodById = exports.getAllPaymentMethods = void 0;
const payment_methods_1 = require("../../models/schema/admin/payment_methods");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const response_1 = require("../../utils/response");
const handleImages_1 = require("../../utils/handleImages");
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
const createPaymentMethod = async (req, res) => {
    const { name, discription, icon, type, ar_name, isActive } = req.body;
    if (!name || !ar_name || !discription || !icon || !type) {
        throw new BadRequest_1.BadRequest("Please provide all the required fields");
    }
    const existingPaymentMethod = await payment_methods_1.PaymentMethodModel.findOne({
        $or: [{ name }, { ar_name }]
    });
    if (existingPaymentMethod)
        throw new BadRequest_1.BadRequest("Payment method already exists");
    const iconUrl = await (0, handleImages_1.saveBase64Image)(icon, Date.now().toString(), req, "payment_methods");
    const paymentMethod = await payment_methods_1.PaymentMethodModel.create({
        name,
        ar_name,
        discription,
        icon: iconUrl,
        isActive: isActive !== undefined ? isActive : true,
        type
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Payment method created successfully",
        paymentMethod,
    });
};
exports.createPaymentMethod = createPaymentMethod;
const updatePaymentMethod = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Payment method id is required");
    const { name, ar_name, discription, icon, type, isActive } = req.body;
    const paymentMethod = await payment_methods_1.PaymentMethodModel.findById(id);
    if (!paymentMethod)
        throw new NotFound_1.NotFound("Payment method not found");
    if (name !== undefined)
        paymentMethod.name = name;
    if (ar_name !== undefined)
        paymentMethod.ar_name = ar_name;
    if (discription !== undefined)
        paymentMethod.discription = discription;
    if (type !== undefined)
        paymentMethod.type = type;
    if (isActive !== undefined)
        paymentMethod.isActive = isActive;
    if (icon) {
        paymentMethod.icon = await (0, handleImages_1.saveBase64Image)(icon, Date.now().toString(), req, "payment_methods");
    }
    await paymentMethod.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Payment method updated successfully",
        paymentMethod,
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
