import Joi from "joi";

export const createBrandSchema = Joi.object({
    name: Joi.string().required(),
    logo: Joi.string().optional(),
});

export const updateBrandSchema = Joi.object({
    name: Joi.string().optional(),
    logo: Joi.string().optional(),
});