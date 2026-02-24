"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCouponSchema = exports.createCouponSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createCouponSchema = joi_1.default.object({
    coupon_code: joi_1.default.string().max(100).required(),
    type: joi_1.default.string().valid("percentage", "flat").required(),
    amount: joi_1.default.number().precision(2).positive().required(),
    minimum_amount_for_use: joi_1.default.number().precision(2).min(0).default(0),
    quantity: joi_1.default.number().integer().positive().required(),
    available: joi_1.default.number().integer().min(0).required(),
    expired_date: joi_1.default.date().greater("now").required(),
});
exports.updateCouponSchema = joi_1.default.object({
    coupon_code: joi_1.default.string().max(100),
    type: joi_1.default.string().valid("percentage", "flat"),
    amount: joi_1.default.number().precision(2).positive(),
    minimum_amount_for_use: joi_1.default.number().precision(2).min(0),
    quantity: joi_1.default.number().integer().positive(),
    available: joi_1.default.number().integer().min(0),
    expired_date: joi_1.default.date().greater("now"),
});
