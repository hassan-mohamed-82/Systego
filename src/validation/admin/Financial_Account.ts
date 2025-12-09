import Joi from "joi";

export const createBankAccountSchema = Joi.object({
  name: Joi.string().required(),
  warhouseId: Joi.string().required(),
  image: Joi.string().optional(),
  balance: Joi.number().optional(),
  description: Joi.string().optional(),
  status: Joi.boolean().optional(),
  in_POS: Joi.boolean().optional(),
 
});

export const updateBankAccountSchema = Joi.object({
  name: Joi.string().optional(),
  warhouseId: Joi.string().optional(),
  image: Joi.string().optional(),
  balance: Joi.number().optional(),
  description: Joi.string().optional(),
  status: Joi.boolean().optional(),
  in_POS: Joi.boolean().optional(),
  
});
