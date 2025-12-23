import Joi from "joi";

export const createUserSchema = Joi.object({
    username: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
   // positionId: Joi.string().required(),
    company_name: Joi.string().optional(),
    phone: Joi.string().optional(),
    image_base64: Joi.string().optional(),
    address: Joi.string().optional(),
    vat_number: Joi.string().optional(),
    state: Joi.string().optional(),
    warehouse_id: Joi.string().optional(),
    postal_code: Joi.string().optional(),
    role: Joi.string().valid("superadmin", "admin").optional(),
});

export const updateUserSchema = Joi.object({
    username: Joi.string().optional(),
    email: Joi.string().email().optional(),
    password: Joi.string().optional(),
   // positionId: Joi.string().optional(),
    company_name: Joi.string().optional(),
    phone: Joi.string().optional(),
    image_base64: Joi.string().optional(),
    address: Joi.string().optional(),
    vat_number: Joi.string().optional(),
    warehouse_id: Joi.string().optional(),
    state: Joi.string().optional(),
    postal_code: Joi.string().optional(),
    role: Joi.string().valid("superadmin", "admin").optional(),
});