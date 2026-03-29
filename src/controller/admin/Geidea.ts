import { Request, Response } from "express";
import { GeideaModel } from "../../models/schema/admin/Geidea";
import { SuccessResponse } from "../../utils/response";
import { NotFound, BadRequest } from "../../Errors";


export const addOrUpdateGeideaConfig = async (req: Request, res: Response) => {
    const { payment_method_id, publicKey, apiPassword, merchantId, webhookSecret, isActive } = req.body;

    // بندور هل في إعدادات موجودة أصلاً ولا لأ (بنجيب أول واحد)
    let config = await GeideaModel.findOne();

    if (config) {
        // لو موجودة، بنعمل تحديث (Update)
        config.payment_method_id = payment_method_id || config.payment_method_id;
        config.publicKey = publicKey || config.publicKey;
        config.apiPassword = apiPassword || config.apiPassword;
        config.merchantId = merchantId || config.merchantId;
        config.webhookSecret = webhookSecret || config.webhookSecret;
        if (isActive !== undefined) config.isActive = isActive;

        await config.save();
        return SuccessResponse(res, { 
            message: " updated successfully", 
            config 
        });
    } else {
        // لو مش موجودة، بنعمل إنشاء جديد (Create)
        if (!payment_method_id || !publicKey || !apiPassword || !merchantId || !webhookSecret) {
            throw new BadRequest("all fields (payment_method_id, publicKey, apiPassword, merchantId, webhookSecret) are required to create Geidea config");
        }

        config = await GeideaModel.create({
            payment_method_id,
            publicKey,
            apiPassword,
            merchantId,
            webhookSecret,
            isActive: isActive !== undefined ? isActive : true
        });

        return SuccessResponse(res, { 
            message: "Geidea config created successfully", 
            config 
        }, 201);
    }
};


export const getGeideaConfig = async (req: Request, res: Response) => {
    // بنجيب الإعدادات وبنعمل populate عشان نجيب اسم طريقة الدفع المرتبطة بيها
    const config = await GeideaModel.findOne().populate('payment_method_id', 'name ar_name type');

    if (!config) {
        throw new NotFound("Geidea config not found");
    }

    SuccessResponse(res, { config });
};


export const deleteGeideaConfig = async (req: Request, res: Response) => {
    const config = await GeideaModel.findOneAndDelete();

    if (!config) {
        throw new NotFound("Geidea config not found");
    }

    SuccessResponse(res, { 
        message: "Geidea config deleted successfully" 
    });
};