import Joi from "joi";

export const createCategorySchema = Joi.object({
  name: Joi.string().required(),
  image: Joi.string().optional(),
  parentId: Joi.string().optional(),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().optional(),
  image: Joi.string().optional(),
  parentId: Joi.string().optional(),
});