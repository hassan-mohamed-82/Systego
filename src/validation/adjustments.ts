import Joi from "joi";

export const createAdjustmentSchema = Joi.object({
  date: Joi.date().required().messages({
    "any.required": "Date is required",
  }),
  reference: Joi.string().max(100).optional(),
  warehouse_id: Joi.string().required().messages({
    "any.required": "Warehouse ID is required",
  }),
  note: Joi.string().allow("", null).optional(),
});

export const updateAdjustmentSchema = Joi.object({
  date: Joi.date().optional(),
  reference: Joi.string().max(100).optional(),
  warehouse_id: Joi.string().optional(),
  note: Joi.string().allow("", null).optional(),
});
