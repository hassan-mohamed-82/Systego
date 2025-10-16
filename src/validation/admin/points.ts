import Joi from "joi";

export const createPointSchema = Joi.object({
    amount: Joi.number().required(),
    points: Joi.number().required(),
});

export const updatePointSchema = Joi.object({
    amount: Joi.number().optional(),
    points: Joi.number().optional(),
});