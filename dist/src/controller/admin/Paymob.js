"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymobId = exports.getPaymob = exports.updatePaymob = exports.createPaymob = void 0;
const Paymob_1 = require("../../models/schema/admin/Paymob");
const payment_methods_1 = require("../../models/schema/admin/payment_methods");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const createPaymob = async (req, res) => {
    const { isActive, sandboxMode, api_key, iframe_id, integration_id, hmac_key, payment_method_id } = req.body;
    if (!api_key || !iframe_id || !integration_id || !hmac_key || !payment_method_id) {
        throw new Errors_1.BadRequest("Please provide all required fields");
    }
    const existingPaymentMethod = await payment_methods_1.PaymentMethodModel.findById(payment_method_id);
    if (!existingPaymentMethod)
        throw new Errors_1.BadRequest("Payment method not found");
    if (existingPaymentMethod.type !== "automatic")
        throw new Errors_1.BadRequest("Payment method is not automatic");
    // التأكد من عدم وجود إعدادات مسبقة لنفس طريقة الدفع
    const exist = await Paymob_1.PaymobModel.findOne({ payment_method_id });
    if (exist)
        throw new Errors_1.BadRequest("Paymob configuration already exists for this payment method");
    const paymob = await Paymob_1.PaymobModel.create({
        isActive: isActive || false,
        sandboxMode: sandboxMode !== undefined ? sandboxMode : true,
        api_key,
        iframe_id,
        integration_id,
        hmac_key,
        payment_method_id,
    });
    return (0, response_1.SuccessResponse)(res, { message: "Paymob created successfully", paymob });
};
exports.createPaymob = createPaymob;
const updatePaymob = async (req, res) => {
    const { id } = req.params;
    const { isActive, sandboxMode, api_key, iframe_id, integration_id, hmac_key } = req.body;
    const paymob = await Paymob_1.PaymobModel.findById(id);
    if (!paymob)
        throw new Errors_1.NotFound("Paymob not found");
    if (isActive !== undefined)
        paymob.isActive = isActive;
    if (sandboxMode !== undefined)
        paymob.sandboxMode = sandboxMode;
    if (api_key)
        paymob.api_key = api_key;
    if (iframe_id)
        paymob.iframe_id = iframe_id;
    if (integration_id)
        paymob.integration_id = integration_id;
    if (hmac_key)
        paymob.hmac_key = hmac_key;
    await paymob.save();
    return (0, response_1.SuccessResponse)(res, { message: "Paymob updated successfully", paymob });
};
exports.updatePaymob = updatePaymob;
const getPaymob = async (req, res) => {
    const paymob = await Paymob_1.PaymobModel.find().populate('payment_method_id', "name icon");
    return (0, response_1.SuccessResponse)(res, { message: "Get Paymob successfully", paymob });
};
exports.getPaymob = getPaymob;
const getPaymobId = async (req, res) => {
    const { id } = req.params;
    const paymob = await Paymob_1.PaymobModel.findById(id).populate("payment_method_id", "name icon");
    if (!paymob)
        throw new Errors_1.NotFound("Paymob not found");
    return (0, response_1.SuccessResponse)(res, { message: "Get Paymob successfully", paymob });
};
exports.getPaymobId = getPaymobId;
