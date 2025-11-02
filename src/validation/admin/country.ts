import Joi from "joi";

export const createcountrySchema = Joi.object({
  name: Joi.string().max(100).required(),
  isDefault: Joi.boolean().optional(),
  ar_name: Joi.string().max(100).required(),
});

export const updatecountrySchema = Joi.object({
  name: Joi.string().max(100).optional(),
  isDefault: Joi.boolean().optional(),
  ar_name: Joi.string().max(100).optional(),
});
