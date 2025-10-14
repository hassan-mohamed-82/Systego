import Joi from "joi";

export const createBookingSchema = Joi.object({
  number_of_days: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      "number.base": "Number of days must be a number",
      "number.min": "Number of days must be at least 1",
      "any.required": "Number of days is required",
    }),

  deposit: Joi.number()
    .min(0)
    .required()
    .messages({
      "number.base": "Deposit must be a number",
      "any.required": "Deposit is required",
    }),

  CustmerId: Joi.string()
    .required()
    .messages({
      "any.required": "Customer ID is required",
    }),

  WarehouseId: Joi.string()
    .required()
    .messages({
      "any.required": "Warehouse ID is required",
    }),

  ProductId: Joi.string()
    .required()
    .messages({
      "array.base": "Product list must be an array",}),

  CategoryId: Joi.string()
    .required()
    .messages({
      "array.base": "Category list must be an array",
    }),

  status: Joi.string()
    .valid("pending", "pay", "failer")
    .default("pending")
    .messages({
      "any.only": "Status must be one of: pending, pay, or failer",
    }),
});

export const updateBookingSchema = Joi.object({
  number_of_days: Joi.number()
    .integer()
    .min(1)
    .messages({
      "number.base": "Number of days must be a number",
      "number.min": "Number of days must be at least 1",
    }),

  deposit: Joi.number()
    .min(0)
    .messages({
      "number.base": "Deposit must be a number",
    }),

  CustmerId: Joi.string()
    .messages({
      "any.required": "Customer is required",
    }),

  WarehouseId: Joi.string().messages({
    
    "any.required": "Warehouse ID is required",  
  }),

  ProductId: Joi.string().messages({
    "any.required": "Product ID is required",
  }),

  CategoryId: Joi.string().messages({
    "any.required": "Category ID is required",
  }),
  status: Joi.string()
    .valid("pending", "pay", "failer")
    .messages({
      "any.only": "Status must be one of: pending, pay, or failer",
    }),
});
