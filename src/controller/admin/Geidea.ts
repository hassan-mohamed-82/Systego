import { Request, Response } from "express";
import { GeideaModel } from "../../models/schema/admin/Geidea";
import { PaymentMethodModel } from "../../models/schema/admin/payment_methods";
import { SuccessResponse } from "../../utils/response";
import { NotFound, BadRequest } from "../../Errors";

export const createGeidea = async (req: Request, res: Response) => {
    const { payment_method_id, publicKey, apiPassword, merchantId, webhookSecret, isActive } = req.body;

    if (!payment_method_id || !publicKey || !apiPassword || !merchantId || !webhookSecret) {
        throw new BadRequest("Please provide all required fields");
    }

    const paymentMethod = await PaymentMethodModel.findById(payment_method_id);
    if (!paymentMethod) throw new BadRequest("Payment method not found");
    if (paymentMethod.type !== "automatic") throw new BadRequest("Payment method is not automatic");

    const existingConfig = await GeideaModel.findOne({ payment_method_id });
    if (existingConfig) {
        throw new BadRequest("Geidea configuration already exists for this payment method");
    }

    const geidea = await GeideaModel.create({
        payment_method_id,
        publicKey,
        apiPassword,
        merchantId,
        webhookSecret,
        isActive: isActive !== undefined ? isActive : true,
    });

    return SuccessResponse(res, { message: "Geidea created successfully", geidea }, 201);
};

export const updateGeidea = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { payment_method_id, publicKey, apiPassword, merchantId, webhookSecret, isActive } = req.body;

    const geidea = await GeideaModel.findById(id);
    if (!geidea) throw new NotFound("Geidea config not found");

    if (payment_method_id) {
        const paymentMethod = await PaymentMethodModel.findById(payment_method_id);
        if (!paymentMethod) throw new BadRequest("Payment method not found");
        if (paymentMethod.type !== "automatic") throw new BadRequest("Payment method is not automatic");

        const existingConfig = await GeideaModel.findOne({
            payment_method_id,
            _id: { $ne: id },
        });

        if (existingConfig) {
            throw new BadRequest("Geidea configuration already exists for this payment method");
        }

        geidea.payment_method_id = payment_method_id;
    }

    if (publicKey) geidea.publicKey = publicKey;
    if (apiPassword) geidea.apiPassword = apiPassword;
    if (merchantId) geidea.merchantId = merchantId;
    if (webhookSecret) geidea.webhookSecret = webhookSecret;
    if (isActive !== undefined) geidea.isActive = isActive;

    await geidea.save();

    return SuccessResponse(res, { message: "Geidea updated successfully", geidea });
};

export const getGeidea = async (_req: Request, res: Response) => {
    const geidea = await GeideaModel.find().populate("payment_method_id", "name ar_name type icon");
    return SuccessResponse(res, { message: "Get Geidea successfully", geidea });
};

export const getGeideaById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const geidea = await GeideaModel.findById(id).populate("payment_method_id", "name ar_name type icon");
    if (!geidea) throw new NotFound("Geidea config not found");

    return SuccessResponse(res, { message: "Get Geidea successfully", geidea });
};

export const deleteGeideaConfig = async (req: Request, res: Response) => {
    const { id } = req.params;
    const config = await GeideaModel.findByIdAndDelete(id);

    if (!config) {
        throw new NotFound("Geidea config not found");
    }

    SuccessResponse(res, {
        message: "Geidea config deleted successfully",
    });
};