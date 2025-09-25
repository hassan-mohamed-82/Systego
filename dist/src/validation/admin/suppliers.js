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
    vat_number: joi_1.default.string().required(),
    state: joi_1.default.string().required(),
    postal_code: joi_1.default.string().required(),
    total_due: joi_1.default.number().required(),
    image: joi_1.default.string().optional(),
});
exports.updateSupplierSchema = joi_1.default.object({
    username: joi_1.default.string().optional(),
    email: joi_1.default.string().email().optional(),
    phone_number: joi_1.default.string().optional(),
    address: joi_1.default.string().optional(),
    vat_number: joi_1.default.string().optional(),
    state: joi_1.default.string().optional(),
    postal_code: joi_1.default.string().optional(),
    total_due: joi_1.default.number().optional(),
    image: joi_1.default.string().optional(),
});
