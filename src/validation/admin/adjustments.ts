import Joi from "joi";

export const createAdjustmentSchema = Joi.object({
  
  warehouse_id: Joi.string().required().messages({
    "any.required": "Warehouse ID is required",
  }),
  note: Joi.string().allow("", null).optional(),
  productId: Joi.string().optional(),
  quantity: Joi.number().required().messages({
    "any.required": "Quantity is required",
    "number.base": "Quantity must be a number",
    "number.positive": "Quantity must be a positive number",
  }),
  select_reasonId: Joi.string().optional(),
  image: Joi.string().optional(),

});

export const updateAdjustmentSchema = Joi.object({
  product_id: Joi.string().optional(),
  quantity: Joi.number().optional(),
  select_reasonId: Joi.string().optional(),
  warehouse_id: Joi.string().optional(),
  note: Joi.string().allow("", null).optional(),
  image: Joi.string().optional(),
});
