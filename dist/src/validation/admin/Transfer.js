"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTransferStatusSchema = exports.createTransferSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createTransferSchema = joi_1.default.object({
    fromWarehouseId: joi_1.default.string()
        .required()
        .messages({
        "any.required": "Source warehouse is required",
        "string.empty": "Source warehouse cannot be empty",
    }),
    toWarehouseId: joi_1.default.string()
        .required()
        .disallow(joi_1.default.ref("fromWarehouseId"))
        .messages({
        "any.required": "Destination warehouse is required",
        "any.invalid": "Source and destination warehouses cannot be the same",
    }),
    // 🧩 مصفوفة المنتجات
    products: joi_1.default.array()
        .items(joi_1.default.object({
        productId: joi_1.default.string()
            .required()
            .messages({
            "any.required": "Product ID is required for each item",
            "string.empty": "Product ID cannot be empty",
        }),
        quantity: joi_1.default.number()
            .positive()
            .required()
            .messages({
            "any.required": "Quantity is required for each product",
            "number.base": "Quantity must be a number",
            "number.positive": "Quantity must be a positive number",
        }),
    }))
        .min(1)
        .required()
        .messages({
        "array.base": "Products must be an array",
        "array.min": "At least one product must be provided",
        "any.required": "Products are required",
    }),
    reason: joi_1.default.string()
        .required()
        .messages({
        "any.required": "Reason for transfer is required",
        "string.empty": "Reason cannot be empty",
    }),
    status: joi_1.default.string()
        .valid("pending", "done", "rejected")
        .required()
        .messages({
        "any.required": "Status is required",
        "string.base": "Status must be a string",
        "string.valid": "Status must be 'pending', 'done', or 'rejected'",
    }),
});
// ✅ فاليديشن لتأكيد الاستلام أو الرفض
exports.updateTransferStatusSchema = joi_1.default.object({
    warehouseId: joi_1.default.string()
        .required()
        .messages({
        "any.required": "Receiving warehouse ID is required",
        "string.empty": "Receiving warehouse ID cannot be empty",
    }),
    approved_products: joi_1.default.array()
        .items(joi_1.default.object({
        productId: joi_1.default.string().required(),
        productPriceId: joi_1.default.string().allow(null, "").optional(),
        quantity: joi_1.default.number().positive().required(),
    }))
        .optional()
        .messages({
        "array.base": "Approved products must be an array",
    }),
    rejected_products: joi_1.default.array()
        .items(joi_1.default.object({
        productId: joi_1.default.string().required(),
        productPriceId: joi_1.default.string().allow(null, "").optional(),
        quantity: joi_1.default.number().positive().required(),
        reason: joi_1.default.string().optional(),
    }))
        .optional()
        .messages({
        "array.base": "Rejected products must be an array",
    }),
    reason: joi_1.default.string()
        .allow("")
        .optional()
        .messages({
        "string.base": "Reason must be a string",
    }),
    status: joi_1.default.string()
        .valid("done", "rejected")
        .required()
        .messages({
        "any.required": "Status is required",
        "string.base": "Status must be a string",
        "string.valid": "Status must be 'approved' or 'rejected'",
    }),
});
