import Joi from "joi";
import { BANNER_PAGES } from "../../types/constant";

const validPages = [...BANNER_PAGES];

export const createBannerSchema = Joi.object({
  name: Joi.array().items(Joi.string().valid(...validPages)).min(1).required(),
  images: Joi.array().items(Joi.string()).min(1).required(),
  isActive: Joi.boolean().optional(),
});

export const updateBannerSchema = Joi.object({
  name: Joi.array().items(Joi.string().valid(...validPages)).min(1).optional(),
  images: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional(),
});
