import Joi from "joi";

export const createcountrySchema = Joi.object({
  name: Joi.string().max(100).required(),
  isDefault: Joi.boolean().optional(),
});

export const updatecountrySchema = Joi.object({
  name: Joi.string().max(100).optional(),
  isDefault: Joi.boolean().optional(),
});
