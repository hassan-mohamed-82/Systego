import Joi from "joi";

export const loginSchema = Joi.object({
    email: Joi.string().required().email().messages({
        "string.email": "Invalid email format",
    }),
    password: Joi.string().required().messages({
        "any.required": "Password is required",
    }),
});


export const signupSchema = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required().messages({
        "string.email": "Invalid email format",
    }),
    password: Joi.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long",
    }),
    phone: Joi.string().required().messages({
        "any.required": "Phone number is required",

    }),
    company_name: Joi.string().optional(),
    address: Joi.string().optional(),
    vat_number: Joi.string().optional(),
    state: Joi.string().optional(),
    postal_code: Joi.string().optional(),
    imageBase64: Joi.string().optional(),

});