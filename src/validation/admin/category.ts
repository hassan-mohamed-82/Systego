import Joi from "joi";

export const createCategorySchema = Joi.object({
  name: Joi.string().required(),
  number_of_products: Joi.number().required(),
  stock_quantity: Joi.number().required(),
  value: Joi.number().optional(),
  image: Joi.string().optional(),
  parentId: Joi.string().optional(),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().optional(),
  number_of_products: Joi.number().optional(),
  stock_quantity: Joi.number().optional(),
  value: Joi.number().optional(),
  image: Joi.string().optional(),
  parentId: Joi.string().optional(),
});