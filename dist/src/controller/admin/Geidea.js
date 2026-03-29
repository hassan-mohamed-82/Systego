"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGeideaConfig = exports.getGeideaById = exports.getGeidea = exports.updateGeidea = exports.createGeidea = void 0;
const Geidea_1 = require("../../models/schema/admin/Geidea");
const payment_methods_1 = require("../../models/schema/admin/payment_methods");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const createGeidea = async (req, res) => {
    const { payment_method_id, publicKey, apiPassword, merchantId, webhookSecret, isActive } = req.body;
    if (!payment_method_id || !publicKey || !apiPassword || !merchantId || !webhookSecret) {
        throw new Errors_1.BadRequest("Please provide all required fields");
    }
    const paymentMethod = await payment_methods_1.PaymentMethodModel.findById(payment_method_id);
    if (!paymentMethod)
        throw new Errors_1.BadRequest("Payment method not found");
    if (paymentMethod.type !== "automatic")
        throw new Errors_1.BadRequest("Payment method is not automatic");
    const existingConfig = await Geidea_1.GeideaModel.findOne({ payment_method_id });
    if (existingConfig) {
        throw new Errors_1.BadRequest("Geidea configuration already exists for this payment method");
    }
    const geidea = await Geidea_1.GeideaModel.create({
        payment_method_id,
        publicKey,
        apiPassword,
        merchantId,
        webhookSecret,
        isActive: isActive !== undefined ? isActive : true,
    });
    return (0, response_1.SuccessResponse)(res, { message: "Geidea created successfully", geidea }, 201);
};
exports.createGeidea = createGeidea;
const updateGeidea = async (req, res) => {
    const { id } = req.params;
    const { payment_method_id, publicKey, apiPassword, merchantId, webhookSecret, isActive } = req.body;
    const geidea = await Geidea_1.GeideaModel.findById(id);
    if (!geidea)
        throw new Errors_1.NotFound("Geidea config not found");
    if (payment_method_id) {
        const paymentMethod = await payment_methods_1.PaymentMethodModel.findById(payment_method_id);
        if (!paymentMethod)
            throw new Errors_1.BadRequest("Payment method not found");
        if (paymentMethod.type !== "automatic")
            throw new Errors_1.BadRequest("Payment method is not automatic");
        const existingConfig = await Geidea_1.GeideaModel.findOne({
            payment_method_id,
            _id: { $ne: id },
        });
        if (existingConfig) {
            throw new Errors_1.BadRequest("Geidea configuration already exists for this payment method");
        }
        geidea.payment_method_id = payment_method_id;
    }
    if (publicKey)
        geidea.publicKey = publicKey;
    if (apiPassword)
        geidea.apiPassword = apiPassword;
    if (merchantId)
        geidea.merchantId = merchantId;
    if (webhookSecret)
        geidea.webhookSecret = webhookSecret;
    if (isActive !== undefined)
        geidea.isActive = isActive;
    await geidea.save();
    return (0, response_1.SuccessResponse)(res, { message: "Geidea updated successfully", geidea });
};
exports.updateGeidea = updateGeidea;
const getGeidea = async (_req, res) => {
    const geidea = await Geidea_1.GeideaModel.find().populate("payment_method_id", "name ar_name type icon");
    return (0, response_1.SuccessResponse)(res, { message: "Get Geidea successfully", geidea });
};
exports.getGeidea = getGeidea;
const getGeideaById = async (req, res) => {
    const { id } = req.params;
    const geidea = await Geidea_1.GeideaModel.findById(id).populate("payment_method_id", "name ar_name type icon");
    if (!geidea)
        throw new Errors_1.NotFound("Geidea config not found");
    return (0, response_1.SuccessResponse)(res, { message: "Get Geidea successfully", geidea });
};
exports.getGeideaById = getGeideaById;
const deleteGeideaConfig = async (req, res) => {
    const { id } = req.params;
    const config = await Geidea_1.GeideaModel.findByIdAndDelete(id);
    if (!config) {
        throw new Errors_1.NotFound("Geidea config not found");
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Geidea config deleted successfully",
    });
};
exports.deleteGeideaConfig = deleteGeideaConfig;
