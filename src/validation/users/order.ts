import Joi from "joi";

export const createOrderSchema = Joi.object({
    shippingAddress: Joi.alternatives().try(
        Joi.string().hex().length(24),
        Joi.object({
            country: Joi.string().required(),
            city: Joi.string().required(),
            zone: Joi.string().required(),
            street: Joi.string().required(),
            buildingNumber: Joi.string().required(),
            floorNumber: Joi.string().allow(""),
            apartmentNumber: Joi.string().allow(""),
            uniqueIdentifier: Joi.string().allow(""),
        })
    ).required().messages({
        "any.required": "Please provide a shipping address",
    }),
    paymentMethod: Joi.string().hex().length(24).required().messages({
        "any.required": "Payment method is required",
    }),
    proofImage: Joi.string().optional(),
});