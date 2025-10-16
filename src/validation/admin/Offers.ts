import Joi from "joi";

export const createOfferSchema = Joi.object({
    productId: Joi.array().required(),
    categoryId: Joi.array().required(),
    discountId: Joi.string().required(),
});

export const updateOfferSchema = Joi.object({
    productId: Joi.array().optional(),
    categoryId: Joi.array().optional(),
    discountId: Joi.string().optional(),
});
