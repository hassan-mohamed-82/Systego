import Joi from "joi";

export const createSupplierSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  phone_number: Joi.string().required(),
  address: Joi.string().required(),
  vat_number: Joi.string().required(),
  state: Joi.string().required(),
  postal_code: Joi.string().required(),
  total_due: Joi.number().required(),
  image: Joi.string().optional(),

});

export const updateSupplierSchema = Joi.object({
  username: Joi.string().optional(),
  email: Joi.string().email().optional(),
  phone_number: Joi.string().optional(),
  address: Joi.string().optional(),
  vat_number: Joi.string().optional(),
  state: Joi.string().optional(),
  postal_code: Joi.string().optional(),
  total_due: Joi.number().optional(),
  image: Joi.string().optional(),
});