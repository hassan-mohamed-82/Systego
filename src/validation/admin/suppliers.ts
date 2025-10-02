import Joi from "joi";

export const createSupplierSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  phone_number: Joi.string().required(),
  address: Joi.string().required(),
  Image: Joi.string().optional(),
  cityId: Joi.string().required(),
  countryId: Joi.string().required(),

});

export const updateSupplierSchema = Joi.object({
  username: Joi.string().optional(),
  email: Joi.string().email().optional(),
  phone_number: Joi.string().optional(),
  address: Joi.string().optional(),
  
  Image: Joi.string().optional(),
  cityId: Joi.string().optional(),
  countryId: Joi.string().optional(),
});