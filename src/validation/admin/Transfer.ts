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

  // 🧩 مصفوفة المنتجات
  products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string()
          .required()
          .messages({
            "any.required": "Product ID is required for each item",
            "string.empty": "Product ID cannot be empty",
          }),
        quantity: Joi.number()
          .positive()
          .required()
          .messages({
            "any.required": "Quantity is required for each product",
            "number.base": "Quantity must be a number",
            "number.positive": "Quantity must be a positive number",
          }),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.base": "Products must be an array",
      "array.min": "At least one product must be provided",
      "any.required": "Products are required",
    }),

  reason: Joi.string()
    .required()
    .messages({
      "any.required": "Reason for transfer is required",
      "string.empty": "Reason cannot be empty",
    }),

  status: Joi.string()
    .valid("pending", "approved", "rejected")
    .required()
    .messages({
      "any.required": "Status is required",
      "string.base": "Status must be a string",
      "string.valid": "Status must be 'pending', 'approved', or 'rejected'",
    }),
});


// ✅ فاليديشن لتأكيد الاستلام أو الرفض
export const updateTransferStatusSchema = Joi.object({
  warehouseId: Joi.string()
    .required()
    .messages({
      "any.required": "Receiving warehouse ID is required",
      "string.empty": "Receiving warehouse ID cannot be empty",
    }),

  approved_products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        productPriceId: Joi.string().allow(null, "").optional(),
        quantity: Joi.number().positive().required(),
      })
    )
    .optional()
    .messages({
      "array.base": "Approved products must be an array",
    }),

  rejected_products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        productPriceId: Joi.string().allow(null, "").optional(),
        quantity: Joi.number().positive().required(),
        reason: Joi.string().optional(),
      })
    )
    .optional()
    .messages({
      "array.base": "Rejected products must be an array",
    }),

  reason: Joi.string()
    .allow("")
    .optional()
    .messages({
      "string.base": "Reason must be a string",
    }),

  status: Joi.string()
    .valid("approved", "rejected")
    .required()
    .messages({
      "any.required": "Status is required",
      "string.base": "Status must be a string",
      "string.valid": "Status must be 'approved' or 'rejected'",
    }),
});
