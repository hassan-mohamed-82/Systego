import Joi from "joi";

export const syncCartSchema = Joi.object({
    items: Joi.array().items(Joi.object({
        productId: Joi.string().hex().length(24).required(),
        productVariantId: Joi.string().hex().length(24).optional().allow(null, ""),
        quantity: Joi.number().integer().min(1).required(),
        options: Joi.array().items(Joi.object({
            variationId: Joi.string().hex().length(24).optional().allow(null, ""),
            optionId: Joi.string().hex().length(24).optional().allow(null, ""),
        })).optional(),
    })).required()
});

export const applyCouponSchema = Joi.object({
    couponCode: Joi.string().allow(null, "").optional()
});