"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyCouponSchema = exports.syncCartSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.syncCartSchema = joi_1.default.object({
    items: joi_1.default.array().items(joi_1.default.object({
        productId: joi_1.default.string().hex().length(24).required(),
        productVariantId: joi_1.default.string().hex().length(24).optional().allow(null, ""),
        quantity: joi_1.default.number().integer().min(1).required(),
    })).required()
});
exports.applyCouponSchema = joi_1.default.object({
    couponCode: joi_1.default.string().allow(null, "").optional()
});
