import Joi from "joi";

export const createCurrencySchema = Joi.object({
  name: Joi.string().max(100).required(),
  ar_name: Joi.string().max(100).required(),
});

export const updateCurrencySchema = Joi.object({
  name: Joi.string().max(100).optional(),
  ar_name: Joi.string().max(100).optional(),
});
