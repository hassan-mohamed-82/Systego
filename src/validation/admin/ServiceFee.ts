import Joi from "joi";

export const createServiceFeeSchema = Joi.object({
  title: Joi.string().max(200).required(),
  amount: Joi.number().min(0).required(),
  type: Joi.string().valid("fixed", "percentage").required(),
  module: Joi.string().valid("online", "pos").required(),
  warehouseId: Joi.string().hex().length(24).optional().allow(null, ""),
  status: Joi.boolean().optional().default(true),
});

export const updateServiceFeeSchema = Joi.object({
  title: Joi.string().max(200).optional(),
  amount: Joi.number().min(0).optional(),
  type: Joi.string().valid("fixed", "percentage").optional(),
  module: Joi.string().valid("online", "pos").optional(),
  warehouseId: Joi.string().hex().length(24).optional().allow(null, ""),
  status: Joi.boolean().optional(),
});
