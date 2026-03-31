// controllers/admin/fawryController.ts
import { Request, Response } from "express";
import { FawryModel } from "../../models/schema/admin/Fawry";
import { PaymentMethodModel } from "../../models/schema/admin/payment_methods";
import { NotFound, BadRequest } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const createFawry = async (req: Request, res: Response) => {
    const { isActive, sandboxMode, merchantCode, secureKey, payment_method_id } = req.body;

    if (!merchantCode || !secureKey || !payment_method_id) {
        throw new BadRequest("Please provide all required fields (merchantCode, secureKey, payment_method_id)");
    }

    const existingPaymentMethod = await PaymentMethodModel.findById(payment_method_id);
    if (!existingPaymentMethod) throw new BadRequest("Payment method not found");
    if (existingPaymentMethod.type !== "automatic") throw new BadRequest("Payment method is not automatic");

    // التأكد من عدم وجود إعدادات مسبقة لنفس طريقة الدفع
    const exist = await FawryModel.findOne({ payment_method_id });
    if (exist) throw new BadRequest("Fawry configuration already exists for this payment method");

    const fawry = await FawryModel.create({
        isActive: isActive || false,
        sandboxMode: sandboxMode !== undefined ? sandboxMode : true,
        merchantCode,
        secureKey,
        payment_method_id,
    });

    return SuccessResponse(res, { message: "Fawry created successfully", fawry }, 201);
};

export const updateFawry = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive, sandboxMode, merchantCode, secureKey } = req.body;

    const fawry = await FawryModel.findById(id);
    if (!fawry) throw new NotFound("Fawry not found");

    if (isActive !== undefined) fawry.isActive = isActive;
    if (sandboxMode !== undefined) fawry.sandboxMode = sandboxMode;
    if (merchantCode) fawry.merchantCode = merchantCode;
    if (secureKey) fawry.secureKey = secureKey;

    await fawry.save();

    return SuccessResponse(res, { message: "Fawry updated successfully", fawry });
};

export const getFawry = async (req: Request, res: Response) => {
    const fawry = await FawryModel.find().populate('payment_method_id', "name icon type");
    return SuccessResponse(res, { message: "Get Fawry configurations successfully", fawry });
};

export const getFawryId = async (req: Request, res: Response) => {
    const { id } = req.params;
    const fawry = await FawryModel.findById(id).populate("payment_method_id", "name icon type");
    
    if (!fawry) throw new NotFound("Fawry configuration not found");

    return SuccessResponse(res, { message: "Get Fawry successfully", fawry });
};