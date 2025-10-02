"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSupplierSchema = exports.createSupplierSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createSupplierSchema = joi_1.default.object({
    username: joi_1.default.string().required(),
    email: joi_1.default.string().email().required(),
    phone_number: joi_1.default.string().required(),
    address: joi_1.default.string().required(),
    Image: joi_1.default.string().optional(),
    cityId: joi_1.default.string().required(),
    countryId: joi_1.default.string().required(),
});
exports.updateSupplierSchema = joi_1.default.object({
    username: joi_1.default.string().optional(),
    email: joi_1.default.string().email().optional(),
    phone_number: joi_1.default.string().optional(),
    address: joi_1.default.string().optional(),
    Image: joi_1.default.string().optional(),
    cityId: joi_1.default.string().optional(),
    countryId: joi_1.default.string().optional(),
});
