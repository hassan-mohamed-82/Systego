"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFreeShippingProductsSchema = exports.updateShippingSettingsSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const objectId = joi_1.default.string().hex().length(24);
exports.updateShippingSettingsSchema = joi_1.default.object({
    shippingMethod: joi_1.default.string().valid("zone", "flat_rate", "carrier").required(),
    flatRate: joi_1.default.when("shippingMethod", {
        is: "flat_rate",
        then: joi_1.default.number().min(0).required(),
        otherwise: joi_1.default.forbidden(),
    }),
    carrierRate: joi_1.default.when("shippingMethod", {
        is: "carrier",
        then: joi_1.default.number().min(0).required(),
        otherwise: joi_1.default.forbidden(),
    }),
    carrierId: joi_1.default.when("shippingMethod", {
        is: "carrier",
        then: objectId.allow(null).optional(),
        otherwise: joi_1.default.forbidden(),
    }),
    freeShippingEnabled: joi_1.default.boolean().optional(),
});
exports.updateFreeShippingProductsSchema = joi_1.default.object({
    productIds: joi_1.default.array().items(objectId).required(),
});
