import Joi from "joi";

export const createPointSchema = Joi.object({
    name: Joi.string().required(),
    points: Joi.number().required(),
});

export const updatePointSchema = Joi.object({
    name: Joi.string().optional(),
    points: Joi.number().optional(),
});