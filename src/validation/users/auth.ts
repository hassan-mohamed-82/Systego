import Joi from "joi";

export const signupSchema = Joi.object({
  name: Joi.string().min(3).max(50).required().messages({
    "string.min": "Name must be at least 3 characters long",
    "string.max": "Name cannot exceed 50 characters",
    "any.required": "Name is required",

  }),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().required().email().messages({
    "string.email": "Invalid email format",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

