import Joi from "joi";
export const createZoneSchema = Joi.object({
    name: Joi.string().required(),
    city: Joi.string().required(),
    shippingCost: Joi.number().min(0).default(0),
    Warehouse: Joi.string().required()
});
export const updateZoneSchema = Joi.object({
    name: Joi.string().optional(),
    city: Joi.string().optional(),
    shippingCost: Joi.number().min(0).optional(),
    Warehouse: Joi.string().optional()
});