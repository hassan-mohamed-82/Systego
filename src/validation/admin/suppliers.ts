import Joi from "joi";

export const createSupplierSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  phone_number: Joi.string().required(),
  company_name: Joi.string().optional(),
  address: Joi.string().required(),
  image: Joi.string().optional(),
  cityId: Joi.string().required(),
  countryId: Joi.string().required(),
  contact_person: Joi.string().optional(),
  registration_date: Joi.date().optional(),
  status: Joi.string().valid("active", "inactive").optional(),
  notes: Joi.array().items(Joi.string()).optional(),
});

export const updateSupplierSchema = Joi.object({
  username: Joi.string().optional(),
  email: Joi.string().email().optional(),
  phone_number: Joi.string().optional(),
  address: Joi.string().optional(),
  company_name: Joi.string().optional(),
  image: Joi.string().optional(),
  cityId: Joi.string().optional(),
  countryId: Joi.string().optional(),
  contact_person: Joi.string().optional(),
  registration_date: Joi.date().optional(),
  status: Joi.string().valid("active", "inactive").optional(),
  notes: Joi.array().items(Joi.string()).optional(),
});