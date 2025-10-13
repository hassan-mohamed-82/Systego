import Joi from "joi";
export const createCitySchema = Joi.object({
  name: Joi.string().required(),
  country: Joi.string().required(),
  
});
export const updateCitySchema = Joi.object({
    name: Joi.string().optional(),
    country: Joi.string().optional(),
});