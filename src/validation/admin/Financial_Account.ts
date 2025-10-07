import Joi from "joi";

export const createBankAccountSchema = Joi.object({
  account_no: Joi.string().max(100).required(),
  name: Joi.string().max(100).required(),
  initial_balance: Joi.number().min(0).required(),
  is_default: Joi.boolean().default(false),
  note: Joi.string().allow("", null),
  icon:Joi.string().allow("", null),
});

export const updateBankAccountSchema = Joi.object({
  account_no: Joi.string().max(100),
  name: Joi.string().max(100),
  initial_balance: Joi.number().min(0),
  is_default: Joi.boolean(),
  note: Joi.string().allow("", null),
  icon:Joi.string().allow("", null),
});
