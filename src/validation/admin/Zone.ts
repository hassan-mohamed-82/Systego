import Joi from "joi";
export const createZoneSchema = Joi.object({
    name: Joi.string().required(),
    ar_name: Joi.string().required(),
    cityId: Joi.string().required(),
    countryId: Joi.string().required(),
    cost: Joi.number().min(0).default(0)
    
});
export const updateZoneSchema = Joi.object({
    name: Joi.string().optional(),
    ar_name: Joi.string().optional(),
    cityId: Joi.string().optional(),
    countryId: Joi.string().optional(),
    cost: Joi.number().min(0).optional()
  
});