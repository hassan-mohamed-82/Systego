import Joi from "joi";

export const createTransferSchema = Joi.object({
  fromWarehouseId: Joi.string()
    .required()
    .messages({
      "any.required": "Source warehouse is required",
      "string.empty": "Source warehouse cannot be empty",
    }),

  toWarehouseId: Joi.string()
    .required()
    .disallow(Joi.ref("fromWarehouseId"))
    .messages({
      "any.required": "Destination warehouse is required",
      "any.invalid": "Source and destination warehouses cannot be the same",
    }),

  quantity: Joi.number()
    .positive()
    .required()
    .messages({
      "any.required": "Quantity is required",
      "number.base": "Quantity must be a number",
      "number.positive": "Quantity must be a positive number",
    }),

  productId: Joi.string().optional(),
  categoryId: Joi.string().optional(),
  productCode: Joi.string().optional(),
}).or("productId", "categoryId", "productCode") // لازم يكون فيه واحد على الأقل
  .messages({
    "object.missing": "Please provide productId, categoryId, or productCode",
  });


export const markTransferAsReceivedSchema = Joi.object({
  warehouseId: Joi.string()
    .required()
    .messages({
      "any.required": "Receiving warehouse ID is required",
      "string.empty": "Receiving warehouse ID cannot be empty",
    }),
});