import Joi from "joi";

export const createBillerSchema = Joi.object({
  image: Joi.string().optional(), // Base64 أو URL
  name: Joi.string().max(100).required(),
  company_name: Joi.string().max(200).optional(),
  vat_number: Joi.string().max(50).optional(),
  email: Joi.string().email().max(150).required(),
  phone_number: Joi.string().max(20).required(),
  address: Joi.string().required(),
});

export const updateBillerSchema = Joi.object({
  image: Joi.string().optional(),
  name: Joi.string().max(100).optional(),
  company_name: Joi.string().max(200).optional(),
  vat_number: Joi.string().max(50).optional(),
  email: Joi.string().email().max(150).optional(),
  phone_number: Joi.string().max(20).optional(),
  address: Joi.string().optional(),
});
