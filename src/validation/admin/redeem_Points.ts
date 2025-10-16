import Joi from "joi";

export const createRedeemPointSchema = Joi.object({
   amount: Joi.number().required(),
    points: Joi.number().required(),
});

export const updateRedeemPointSchema = Joi.object({
    amount: Joi.number().optional(),
    points: Joi.number().optional(),
});