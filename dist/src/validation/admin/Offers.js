"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOfferSchema = exports.createOfferSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createOfferSchema = joi_1.default.object({
    productId: joi_1.default.array().required(),
    categoryId: joi_1.default.array().required(),
    discountId: joi_1.default.string().required(),
});
exports.updateOfferSchema = joi_1.default.object({
    productId: joi_1.default.array().optional(),
    categoryId: joi_1.default.array().optional(),
    discountId: joi_1.default.string().optional(),
});
