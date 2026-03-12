import Joi from "joi";

export const createOrderSchema = Joi.object({
    shippingAddress: Joi.string().hex().length(24).required().messages({
        "any.required": "Please select a shipping address",
    }),
    paymentMethod: Joi.string().hex().length(24).required().messages({
        "any.required": "Payment method is required",
    }),
    proofImage: Joi.string().optional(),
});