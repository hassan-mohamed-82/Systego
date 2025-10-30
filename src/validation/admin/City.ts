import Joi from "joi";
export const createCitySchema = Joi.object({
  name: Joi.string().required(),
  ar_name: Joi.string().required(),
  country: Joi.string().required(),
  shipingCost: Joi.number().min(0).default(0)
});
export const updateCitySchema = Joi.object({
    name: Joi.string().optional(),
    ar_name: Joi.string().optional(),
    country: Joi.string().optional(),
    shipingCost: Joi.number().min(0).optional()
  });