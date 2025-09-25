import Joi from "joi";

export const createCourierSchema = Joi.object({
  name: Joi.string().max(100).required(),
  phone_number: Joi.string().max(20).required(),
  address: Joi.string().required(),
});

export const updateCourierSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  phone_number: Joi.string().max(20).optional(),
  address: Joi.string().optional(),
});
