import Joi from "joi";

export const signupSchema = Joi.object({
  name: Joi.string().min(3).max(50).required().messages({
    "string.min": "Name must be at least 3 characters long",
    "string.max": "Name cannot exceed 50 characters",
    "any.required": "Name is required",

  }),
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().required(),
});

export const loginSchema = Joi.object({
  identifier: Joi.string(),
  email: Joi.string().email().messages({
    "string.email": "Invalid email format",
  }),
  password: Joi.string(),
}).or("identifier", "email");

export const verifyOtpSchema = Joi.object({
  identifier: Joi.string(),
  email: Joi.string().email().messages({
    "string.email": "Invalid email format",
  }),
  otp: Joi.string().length(6).required().messages({
    "string.length": "OTP must be exactly 6 digits",
    "any.required": "OTP is required",
  }),
}).or("identifier", "email");

export const resendOtpSchema = Joi.object({
  identifier: Joi.string(),
  email: Joi.string().email().messages({
    "string.email": "Invalid email format",
  }),
}).or("identifier", "email");

