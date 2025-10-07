"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markTransferAsReceivedSchema = exports.createTransferSchema = void 0;
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
    quantity: joi_1.default.number()
        .positive()
        .required()
        .messages({
        "any.required": "Quantity is required",
        "number.base": "Quantity must be a number",
        "number.positive": "Quantity must be a positive number",
    }),
    productId: joi_1.default.string().optional(),
    categoryId: joi_1.default.string().optional(),
    productCode: joi_1.default.string().optional(),
}).or("productId", "categoryId", "productCode") // لازم يكون فيه واحد على الأقل
    .messages({
    "object.missing": "Please provide productId, categoryId, or productCode",
});
exports.markTransferAsReceivedSchema = joi_1.default.object({
    warehouseId: joi_1.default.string()
        .required()
        .messages({
        "any.required": "Receiving warehouse ID is required",
        "string.empty": "Receiving warehouse ID cannot be empty",
    }),
});
