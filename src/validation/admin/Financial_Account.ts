import Joi from "joi";

export const createBankAccountSchema = Joi.object({
  name: Joi.string().required(),
  warehouseId: Joi.array().items(Joi.string().hex().length(24)).required(),
  image: Joi.string().optional(),
  balance: Joi.number().optional(),
  description: Joi.string().optional(),
  status: Joi.boolean().optional(),
  in_POS: Joi.boolean().optional(),
 
});

export const updateBankAccountSchema = Joi.object({
  name: Joi.string().optional(),
  warehouseId: Joi.array().items(Joi.string().hex().length(24)).optional(),
  image: Joi.string().optional(),
  balance: Joi.number().optional(),
  description: Joi.string().optional(),
  status: Joi.boolean().optional(),
  in_POS: Joi.boolean().optional(),
  
});
