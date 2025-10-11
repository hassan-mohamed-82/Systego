import Joi from "joi";

export const createStockSchema = Joi.object({
  warehouseId: Joi.string().required(),
  type: Joi.string().required(),
  category_id: Joi.array().optional(),
  brand_id: Joi.array().optional(), 
}); 

export const finalStockSchema = Joi.object({
});