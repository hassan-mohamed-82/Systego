// controllers/admin/paymobController.ts
import { Request, Response } from "express";
import { PaymobModel } from "../../models/schema/admin/Paymob";
import { PaymentMethodModel } from "../../models/schema/admin/payment_methods";
import { NotFound, BadRequest } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const createPaymob = async (req: Request, res: Response) => {
    const { isActive, sandboxMode, api_key, iframe_id, integration_id, hmac_key, payment_method_id } = req.body;

    if (!api_key || !iframe_id || !integration_id || !hmac_key || !payment_method_id) {
        throw new BadRequest("Please provide all required fields");
    }

    const existingPaymentMethod = await PaymentMethodModel.findById(payment_method_id);
    if (!existingPaymentMethod) throw new BadRequest("Payment method not found");
    if (existingPaymentMethod.type !== "automatic") throw new BadRequest("Payment method is not automatic");

    // التأكد من عدم وجود إعدادات مسبقة لنفس طريقة الدفع
    const exist = await PaymobModel.findOne({ payment_method_id });
    if (exist) throw new BadRequest("Paymob configuration already exists for this payment method");

    const paymob = await PaymobModel.create({
        isActive: isActive || false,
        sandboxMode: sandboxMode !== undefined ? sandboxMode : true,
        api_key,
        iframe_id,
        integration_id,
        hmac_key,
        payment_method_id,
    });

    return SuccessResponse(res, { message: "Paymob created successfully", paymob });
};

export const updatePaymob = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive, sandboxMode, api_key, iframe_id, integration_id, hmac_key } = req.body;

    const paymob = await PaymobModel.findById(id);
    if (!paymob) throw new NotFound("Paymob not found");

    if (isActive !== undefined) paymob.isActive = isActive;
    if (sandboxMode !== undefined) paymob.sandboxMode = sandboxMode;
    if (api_key) paymob.api_key = api_key;
    if (iframe_id) paymob.iframe_id = iframe_id;
    if (integration_id) paymob.integration_id = integration_id;
    if (hmac_key) paymob.hmac_key = hmac_key;

    await paymob.save();

    return SuccessResponse(res, { message: "Paymob updated successfully", paymob });
};

export const getPaymob = async (req: Request, res: Response) => {
    const paymob = await PaymobModel.find().populate('payment_method_id', "name icon");
    return SuccessResponse(res, { message: "Get Paymob successfully", paymob });
};

export const getPaymobId = async (req: Request, res: Response) => {
    const { id } = req.params;
    const paymob = await PaymobModel.findById(id).populate("payment_method_id", "name icon");
    if (!paymob) throw new NotFound("Paymob not found");

    return SuccessResponse(res, { message: "Get Paymob successfully", paymob });
};