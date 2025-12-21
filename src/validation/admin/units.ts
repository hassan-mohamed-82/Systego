import Joi from "joi";

export const CreateUnitSchema = Joi.object({
  code: Joi.string().required(),
  name: Joi.string().required(),
  ar_name: Joi.string().required(),
  base_unit: Joi.string().optional().allow(null),
  operator: Joi.string().valid("*", "/").default("*"),
  operator_value: Joi.number().min(0).default(1),
  is_base_unit: Joi.boolean().default(false),
  status: Joi.boolean().default(true)
});

export const UpdateUnitSchema = Joi.object({
  code: Joi.string().optional(),
  name: Joi.string().optional(),
  ar_name: Joi.string().optional(),
  base_unit: Joi.string().optional().allow(null),
  operator: Joi.string().valid("*", "/").optional(),
  operator_value: Joi.number().min(0).optional(),
  is_base_unit: Joi.boolean().optional(),
  status: Joi.boolean().optional()
});
