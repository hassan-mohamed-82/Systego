"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAddressSchema = exports.addressSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.addressSchema = joi_1.default.object({
    country: joi_1.default.string().hex().length(24).required().messages({
        "any.required": "Country is required",
    }),
    city: joi_1.default.string().hex().length(24).required().messages({
        "any.required": "City is required",
    }),
    zone: joi_1.default.string().hex().length(24).required().messages({
        "any.required": "Zone is required",
    }),
    street: joi_1.default.string().min(3).required().messages({
        "string.min": "Street must be at least 3 characters long",
        "any.required": "Street is required",
    }),
    buildingNumber: joi_1.default.string().required().messages({
        "any.required": "Building number is required",
    }),
    floorNumber: joi_1.default.string().optional(),
    apartmentNumber: joi_1.default.string().optional(),
    uniqueIdentifier: joi_1.default.string().optional(),
});
exports.updateAddressSchema = exports.addressSchema.fork(['country', 'city', 'zone', 'street', 'buildingNumber'], (schema) => schema.optional());
