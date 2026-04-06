import Joi from "joi";

export const signupSchema = Joi.object({
  name: Joi.string().min(3).max(50).required().messages({
    "string.min": "Name must be at least 3 characters long",
    "string.max": "Name cannot exceed 50 characters",
    "any.required": "Name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),
  phone: Joi.string().required().messages({
    "any.required": "Phone number is required",
  }),
  image: Joi.string().allow(null, ""), // Base64 string
});

export const loginSchema = Joi.object({
  identifier: Joi.string().required().messages({
    "any.required": "Email, Phone, or name is required",
  }),
  password: Joi.string().allow(""), // Allowed empty for POS users triggering OTP
});

export const verifyOtpSchema = Joi.object({
  identifier: Joi.string().required(),
  otp: Joi.string().length(6).required().messages({
    "string.length": "OTP must be exactly 6 digits",
    "any.required": "OTP is required",
  }),
});

export const resendOtpSchema = Joi.object({
  identifier: Joi.string().required(),
});

// For POS users completing their profile
export const completeProfileSchema = Joi.object({
  userId: Joi.string().required(),
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
  }),
  image: Joi.string().allow(null, ""),
});

export const editProfileSchema = Joi.object({
  name: Joi.string().min(3).max(50),
  email: Joi.string().email(),
  phone: Joi.string(),
  password: Joi.string().min(6),
  image: Joi.string().allow(null, ""),
});