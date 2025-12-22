import Joi from "joi";

export const createCategorySchema = Joi.object({
  name: Joi.string().required(),
  ar_name: Joi.string().required(),
  image: Joi.string().optional().allow("", null),
  parentId: Joi.string().optional().allow("", null),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().optional(),
  ar_name: Joi.string().optional(),
  image: Joi.string().optional().allow("", null),
  parentId: Joi.string().optional().allow("", null),
});
