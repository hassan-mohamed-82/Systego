import Joi from "joi";

export const ExpenseCategorySchema = Joi.object({
  name: Joi.string().max(100).required(),
});

export const UpdateExpenseCategorySchema = Joi.object({
  name: Joi.string().max(100).optional(),
});
