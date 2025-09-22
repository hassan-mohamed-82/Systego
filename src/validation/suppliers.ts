import Joi from "joi";

export const createSupplierSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  address: Joi.string().required(),
  vat_number: Joi.string().required(),
  state: Joi.string().required(),
  postal_code: Joi.string().required(),
  image: Joi.string().optional(),

});

export const updateSupplierSchema = Joi.object({
  name: Joi.string().optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
  address: Joi.string().optional(),
  vat_number: Joi.string().optional(),
  state: Joi.string().optional(),
  postal_code: Joi.string().optional(),
  image: Joi.string().optional(),
});