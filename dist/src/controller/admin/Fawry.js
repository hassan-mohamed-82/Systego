"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFawryId = exports.getFawry = exports.updateFawry = exports.createFawry = void 0;
const Fawry_1 = require("../../models/schema/admin/Fawry");
const payment_methods_1 = require("../../models/schema/admin/payment_methods");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const createFawry = async (req, res) => {
    const { isActive, sandboxMode, merchantCode, secureKey, payment_method_id } = req.body;
    if (!merchantCode || !secureKey || !payment_method_id) {
        throw new Errors_1.BadRequest("Please provide all required fields (merchantCode, secureKey, payment_method_id)");
    }
    const existingPaymentMethod = await payment_methods_1.PaymentMethodModel.findById(payment_method_id);
    if (!existingPaymentMethod)
        throw new Errors_1.BadRequest("Payment method not found");
    if (existingPaymentMethod.type !== "automatic")
        throw new Errors_1.BadRequest("Payment method is not automatic");
    // التأكد من عدم وجود إعدادات مسبقة لنفس طريقة الدفع
    const exist = await Fawry_1.FawryModel.findOne({ payment_method_id });
    if (exist)
        throw new Errors_1.BadRequest("Fawry configuration already exists for this payment method");
    const fawry = await Fawry_1.FawryModel.create({
        isActive: isActive || false,
        sandboxMode: sandboxMode !== undefined ? sandboxMode : true,
        merchantCode,
        secureKey,
        payment_method_id,
    });
    return (0, response_1.SuccessResponse)(res, { message: "Fawry created successfully", fawry }, 201);
};
exports.createFawry = createFawry;
const updateFawry = async (req, res) => {
    const { id } = req.params;
    const { isActive, sandboxMode, merchantCode, secureKey } = req.body;
    const fawry = await Fawry_1.FawryModel.findById(id);
    if (!fawry)
        throw new Errors_1.NotFound("Fawry not found");
    if (isActive !== undefined)
        fawry.isActive = isActive;
    if (sandboxMode !== undefined)
        fawry.sandboxMode = sandboxMode;
    if (merchantCode)
        fawry.merchantCode = merchantCode;
    if (secureKey)
        fawry.secureKey = secureKey;
    await fawry.save();
    return (0, response_1.SuccessResponse)(res, { message: "Fawry updated successfully", fawry });
};
exports.updateFawry = updateFawry;
const getFawry = async (req, res) => {
    const fawry = await Fawry_1.FawryModel.find().populate('payment_method_id', "name icon type");
    return (0, response_1.SuccessResponse)(res, { message: "Get Fawry configurations successfully", fawry });
};
exports.getFawry = getFawry;
const getFawryId = async (req, res) => {
    const { id } = req.params;
    const fawry = await Fawry_1.FawryModel.findById(id).populate("payment_method_id", "name icon type");
    if (!fawry)
        throw new Errors_1.NotFound("Fawry configuration not found");
    return (0, response_1.SuccessResponse)(res, { message: "Get Fawry successfully", fawry });
};
exports.getFawryId = getFawryId;
