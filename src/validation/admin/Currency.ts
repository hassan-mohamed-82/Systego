import Joi from "joi";

export const createCurrencySchema = Joi.object({
  name: Joi.string().max(100).required(),
  ar_name: Joi.string().max(100).required(),
  amount: Joi.number().min(0),
  status: Joi.boolean().optional().default(false),
});

export const updateCurrencySchema = Joi.object({
  name: Joi.string().max(100).optional(),
  ar_name: Joi.string().max(100).optional(),
  amount: Joi.number().min(0).optional(),
  status: Joi.boolean().optional(),
});
