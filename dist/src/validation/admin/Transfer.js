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
});
// ✅ فاليديشن لتأكيد الاستلام أو الرفض
exports.updateTransferStatusSchema = joi_1.default.object({
    warehouseId: joi_1.default.string()
        .required()
        .messages({
        "any.required": "Receiving warehouse ID is required",
        "string.empty": "Receiving warehouse ID cannot be empty",
    }),
    status: joi_1.default.string()
        .valid("received", "rejected")
        .required()
        .messages({
        "any.required": "Status is required",
        "any.only": "Status must be either 'received' or 'rejected'",
    }),
    // في حالة الرفض ممكن نرسل منتجات مرفوضة
    rejectedProducts: joi_1.default.array()
        .items(joi_1.default.string())
        .when("status", {
        is: "rejected",
        then: joi_1.default.required(),
        otherwise: joi_1.default.forbidden(),
    })
        .messages({
        "any.required": "rejectedProducts is required when rejecting a transfer",
    }),
    reason: joi_1.default.string()
        .allow("")
        .when("status", {
        is: "rejected",
        then: joi_1.default.optional(),
        otherwise: joi_1.default.forbidden(),
    })
        .messages({
        "string.base": "Reason must be a string",
    }),
});
