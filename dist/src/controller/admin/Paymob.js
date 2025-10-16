"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePaymob = exports.createpaymob = exports.getPaymob = void 0;
const Paymob_1 = require("../../models/schema/admin/Paymob");
const payment_methods_1 = require("../../models/schema/admin/payment_methods");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const getPaymob = async (req, res) => {
    const { id } = req.params;
    const paymob = await Paymob_1.PaymobModel.findById(id);
    if (!paymob)
        throw new Errors_1.NotFound("Paymob not found");
    return (0, response_1.SuccessResponse)(res, {
        message: "Get Paymob successfully",
        paymob,
    });
};
exports.getPaymob = getPaymob;
const createpaymob = async (req, res) => {
    const { type, callback, api_key, iframe_id, integration_id, hmac_key, payment_method_id, } = req.body;
    if (!type ||
        !callback ||
        !api_key ||
        !iframe_id ||
        !integration_id ||
        !hmac_key ||
        !payment_method_id)
        throw new BadRequest_1.BadRequest("Please provide all required fields");
    const existingPaymentMethod = await payment_methods_1.PaymentMethodModel.findById(payment_method_id);
    if (!existingPaymentMethod)
        throw new BadRequest_1.BadRequest("Payment method not found");
    if (!existingPaymentMethod.isActive)
        throw new BadRequest_1.BadRequest("Payment method is not active");
    if (existingPaymentMethod.type !== "automatic")
        throw new BadRequest_1.BadRequest("Payment method is not automatic");
    const exist = await Paymob_1.PaymobModel.find();
    if (exist.length > 0)
        throw new BadRequest_1.BadRequest("Paymob already exists");
    const paymob = await Paymob_1.PaymobModel.create({
        type,
        callback,
        api_key,
        iframe_id,
        integration_id,
        hmac_key,
        payment_method_id,
    });
    return (0, response_1.SuccessResponse)(res, {
        message: "Paymob created successfully",
        paymob,
    });
};
exports.createpaymob = createpaymob;
const updatePaymob = async (req, res) => {
    const { id } = req.params;
    const { type, callback, api_key, iframe_id, integration_id, hmac_key, payment_method_id, } = req.body;
    // تحقق من وجود السجل
    const paymob = await Paymob_1.PaymobModel.findById(id);
    if (!paymob)
        throw new Errors_1.NotFound("Paymob not found");
    // لو المستخدم بعت payment_method_id جديد، نتحقق منه
    if (payment_method_id) {
        const existingPaymentMethod = await payment_methods_1.PaymentMethodModel.findById(payment_method_id);
        if (!existingPaymentMethod)
            throw new BadRequest_1.BadRequest("Payment method not found");
        if (!existingPaymentMethod.isActive)
            throw new BadRequest_1.BadRequest("Payment method is not active");
        if (existingPaymentMethod.type !== "automatic")
            throw new BadRequest_1.BadRequest("Payment method is not automatic");
        paymob.payment_method_id = payment_method_id;
    }
    // حدّث الحقول اللي المستخدم بعتها فقط
    if (type)
        paymob.type = type;
    if (callback)
        paymob.callback = callback;
    if (api_key)
        paymob.api_key = api_key;
    if (iframe_id)
        paymob.iframe_id = iframe_id;
    if (integration_id)
        paymob.integration_id = integration_id;
    if (hmac_key)
        paymob.hmac_key = hmac_key;
    await paymob.save();
    return (0, response_1.SuccessResponse)(res, {
        message: "Paymob updated successfully",
        paymob,
    });
};
exports.updatePaymob = updatePaymob;
