import Joi from "joi";

export const createPandelSchema = Joi.object({
    name: Joi.string().required(),
    startdate: Joi.date().required(),
    enddate: Joi.date().required(),
    status: Joi.boolean(),
    images: Joi.array().items(Joi.string().base64()).required(),
    productsId: Joi.array().items(Joi.string().hex().length(24)).required().min(2),
    price: Joi.number().required(),
});

export const updatePandelSchema = Joi.object({
    name: Joi.string(),
    startdate: Joi.date(),
    enddate: Joi.date(),
    status: Joi.boolean(),
    images: Joi.array().items(Joi.string().base64()),
    productsId: Joi.array().items(Joi.string().hex().length(24)),
    price: Joi.number(),
});
