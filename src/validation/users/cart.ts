import Joi from "joi";

export const addToCartSchema = Joi.object({
    product: Joi.string().hex().length(24).required().messages({
        "any.required": "Product ID is required",
    }),
    quantity: Joi.number().min(1).default(1).messages({
        "number.min": "Quantity must be at least 1",
    }),
});

export const updateQuantitySchema = Joi.object({
    productId: Joi.string().hex().length(24).required(),
    quantity: Joi.number().min(1).required(),
});