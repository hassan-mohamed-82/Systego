"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGeideaConfig = exports.getGeideaConfig = exports.addOrUpdateGeideaConfig = void 0;
const Geidea_1 = require("../../models/schema/admin/Geidea");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const addOrUpdateGeideaConfig = async (req, res) => {
    const { payment_method_id, publicKey, apiPassword, merchantId, webhookSecret, isActive } = req.body;
    // بندور هل في إعدادات موجودة أصلاً ولا لأ (بنجيب أول واحد)
    let config = await Geidea_1.GeideaModel.findOne();
    if (config) {
        // لو موجودة، بنعمل تحديث (Update)
        config.payment_method_id = payment_method_id || config.payment_method_id;
        config.publicKey = publicKey || config.publicKey;
        config.apiPassword = apiPassword || config.apiPassword;
        config.merchantId = merchantId || config.merchantId;
        config.webhookSecret = webhookSecret || config.webhookSecret;
        if (isActive !== undefined)
            config.isActive = isActive;
        await config.save();
        return (0, response_1.SuccessResponse)(res, {
            message: " updated successfully",
            config
        });
    }
    else {
        // لو مش موجودة، بنعمل إنشاء جديد (Create)
        if (!payment_method_id || !publicKey || !apiPassword || !merchantId || !webhookSecret) {
            throw new Errors_1.BadRequest("all fields (payment_method_id, publicKey, apiPassword, merchantId, webhookSecret) are required to create Geidea config");
        }
        config = await Geidea_1.GeideaModel.create({
            payment_method_id,
            publicKey,
            apiPassword,
            merchantId,
            webhookSecret,
            isActive: isActive !== undefined ? isActive : true
        });
        return (0, response_1.SuccessResponse)(res, {
            message: "Geidea config created successfully",
            config
        }, 201);
    }
};
exports.addOrUpdateGeideaConfig = addOrUpdateGeideaConfig;
const getGeideaConfig = async (req, res) => {
    // بنجيب الإعدادات وبنعمل populate عشان نجيب اسم طريقة الدفع المرتبطة بيها
    const config = await Geidea_1.GeideaModel.findOne().populate('payment_method_id', 'name ar_name type');
    if (!config) {
        throw new Errors_1.NotFound("Geidea config not found");
    }
    (0, response_1.SuccessResponse)(res, { config });
};
exports.getGeideaConfig = getGeideaConfig;
const deleteGeideaConfig = async (req, res) => {
    const config = await Geidea_1.GeideaModel.findOneAndDelete();
    if (!config) {
        throw new Errors_1.NotFound("Geidea config not found");
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Geidea config deleted successfully"
    });
};
exports.deleteGeideaConfig = deleteGeideaConfig;
