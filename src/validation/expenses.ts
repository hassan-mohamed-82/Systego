import Joi from "joi";

export const createExpenseSchema = Joi.object({
  date: Joi.date().required().messages({
    "any.required": "Expense date is required",
  }),
  reference: Joi.string().max(100).allow(null, ""),
  warehouse_id: Joi.string().hex().length(24).required().messages({
    "any.required": "Warehouse ID is required",
  }),
  expense_category_id: Joi.string().hex().length(24).required().messages({
    "any.required": "Expense category is required",
  }),
  amount: Joi.number().positive().precision(2).required().messages({
    "any.required": "Amount is required",
    "number.positive": "Amount must be greater than 0",
  }),
  note: Joi.string().allow(null, ""),
 
});


export const updateExpenseSchema = Joi.object({
  date: Joi.date().optional().messages({
    "any.required": "Expense date is required",
  }),
  reference: Joi.string().max(100).allow(null, ""),
  warehouse_id: Joi.string().hex().length(24).optional().messages({
    "any.required": "Warehouse ID is required",
  }),
  expense_category_id: Joi.string().hex().length(24).optional().messages({
    "any.required": "Expense category is required",
  }),
  amount: Joi.number().positive().precision(2).optional().messages({
    "any.required": "Amount is required",
    "number.positive": "Amount must be greater than 0",
  }),
  note: Joi.string().allow(null, ""),
});