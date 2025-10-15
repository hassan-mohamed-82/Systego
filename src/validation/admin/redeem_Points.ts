import Joi from "joi";

export const createRedeemPointSchema = Joi.object({
    name: Joi.string().required(),
    points: Joi.number().required(),
});

export const updateRedeemPointSchema = Joi.object({
    name: Joi.string().optional(),
    points: Joi.number().optional(),
});