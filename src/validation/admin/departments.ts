import Joi from "joi";

export const createDepartmentSchema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    ar_name: Joi.string().required(),
    ar_description: Joi.string().required(),
});

export const updateDepartmentSchema = Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    ar_name: Joi.string().optional(),
    ar_description: Joi.string().optional(),
});