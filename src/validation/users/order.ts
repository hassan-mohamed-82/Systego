import Joi from "joi";

export const createOrderSchema = Joi.object({
    orderType: Joi.string().valid("delivery", "pickup").default("delivery"),
    warehouseId: Joi.string().hex().length(24).when("orderType", {
        is: "pickup",
        then: Joi.required(),
        otherwise: Joi.optional()
    }),
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
    ).when("orderType", {
        is: "delivery",
        then: Joi.required(),
        otherwise: Joi.optional()
    }).messages({
        "any.required": "Please provide a shipping address",
    }),
    paymentMethod: Joi.string().hex().length(24).required().messages({
        "any.required": "Payment method is required",
    }),
    proofImage: Joi.string().optional(),
    sessionId: Joi.string().optional(),
});