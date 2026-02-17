import Joi from "joi";

export const createVariationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 1 character long",
    "string.max": "Name must be at most 200 characters long",
    "any.required": "Name is required",
    "any.unique": "Name already exists",
  }),
  ar_name: Joi.string().trim().min(1).max(200).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 1 character long",
    "string.max": "Name must be at most 200 characters long",
    "any.required": "Name is required",
    "any.unique": "Name already exists",
  }),
  options: Joi.array().items(
    Joi.alternatives().try(
      Joi.string().trim().min(1).max(200),     
      Joi.object({
        name: Joi.string().trim().min(1).max(200).required(),
        status: Joi.boolean().optional(),
      })
    )
  )
});

export const updateVariationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional(),
  ar_name: Joi.string().trim().min(1).max(200).optional(),
  options: Joi.array().items(
    Joi.object({
      _id: Joi.string().optional(), // لو موجود → update
      name: Joi.string().trim().min(1).max(200).required(),
      status: Joi.boolean().optional()
    })
  ).optional()
});

