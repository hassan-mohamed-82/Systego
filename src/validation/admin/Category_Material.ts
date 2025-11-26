import Joi from "joi";

export const createCategoryMaterialSchema = Joi.object({
  name: Joi.string().required(),
  ar_name: Joi.string().required(),
  image:Joi.string().optional(),
  parent_category_id: Joi.string().optional(),
  is_active:Joi.boolean().default(true),  
});

export const updateCategoryMaterialSchema = Joi.object({
  name: Joi.string().optional(),
  ar_name: Joi.string().optional(),
  image:Joi.string().optional(),
  parent_category_id: Joi.string().optional(),
  is_active:Joi.boolean().optional(),  
});