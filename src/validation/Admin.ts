import Joi from "joi";

export const createUserSchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    role: Joi.string().required(),
    company_name: Joi.string().optional(),
    phone: Joi.string().optional(),
    image_base64: Joi.string().optional(),
    address: Joi.string().optional(),
    vat_number: Joi.string().optional(),
    state: Joi.string().optional(),
    postal_code: Joi.string().optional(),
});

export const updateUserSchema = Joi.object({
    name: Joi.string().optional(),
    email: Joi.string().email().optional(),
    password: Joi.string().optional(),
    role: Joi.string().optional(),
    company_name: Joi.string().optional(),
    phone: Joi.string().optional(),
    image_base64: Joi.string().optional(),
    address: Joi.string().optional(),
    vat_number: Joi.string().optional(),
    state: Joi.string().optional(),
    postal_code: Joi.string().optional(),
});