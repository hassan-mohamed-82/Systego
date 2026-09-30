import Joi from "joi";
import { BANNER_PAGES } from "../../types/constant";

const validPages = [...BANNER_PAGES];

export const createBannerSchema = Joi.object({
  name: Joi.array().items(Joi.string().valid(...validPages)).min(1).required(),
  ar_name: Joi.string().required(),
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  images: Joi.array().items(Joi.string()).min(1).required(),
  link: Joi.string().optional().allow("", null),
  isActive: Joi.boolean().optional(),
});

export const updateBannerSchema = Joi.object({
  name: Joi.array().items(Joi.string().valid(...validPages)).min(1).optional(),
  ar_name: Joi.string().optional(),
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  images: Joi.array().items(Joi.string()).optional(),
  link: Joi.string().optional().allow("", null),
  isActive: Joi.boolean().optional(),
});
