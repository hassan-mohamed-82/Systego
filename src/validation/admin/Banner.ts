import Joi from "joi";

export const createBannerSchema = Joi.object({
  name: Joi.string().required(),
  images: Joi.array().items(Joi.string()).min(1).required(),
  isActive: Joi.boolean().optional(),
});

export const updateBannerSchema = Joi.object({
  name: Joi.string().optional(),
  images: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional(),
});
