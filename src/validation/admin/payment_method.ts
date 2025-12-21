import Joi from "joi";

export const CreatePaymentMethodSchema = Joi.object({
  name: Joi.string().required(),
  ar_name: Joi.string().required(),
  discription: Joi.string().required(),
  isActive: Joi.boolean().default(true),
  icon: Joi.string().required(),
  type: Joi.string().required().valid("manual", "automatic")
});

export const UpdatePaymentMethodSchema = Joi.object({
  name: Joi.string().optional(),
  ar_name: Joi.string().optional(),
  discription: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
  icon: Joi.string().optional(),
  type: Joi.string().optional().valid("manual", "automatic")
});
