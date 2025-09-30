import Joi from "joi";

export const createVariationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  options: Joi.array().items(
    Joi.alternatives().try(
      Joi.string().trim().min(1).max(200),     
      Joi.object({
        name: Joi.string().trim().min(1).max(200).required(),
        status: Joi.boolean().optional()
      })
    )
  )
});

export const updateVariationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional(),
  options: Joi.array().items(
    Joi.object({
      _id: Joi.string().optional(), // لو موجود → update
      name: Joi.string().trim().min(1).max(200).required(),
      status: Joi.boolean().optional()
    })
  ).optional()
});

