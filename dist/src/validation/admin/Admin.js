"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.createUserSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createUserSchema = joi_1.default.object({
    username: joi_1.default.string().required(),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().required(),
    positionId: joi_1.default.string().required(),
    company_name: joi_1.default.string().optional(),
    phone: joi_1.default.string().optional(),
    image_base64: joi_1.default.string().optional(),
    address: joi_1.default.string().optional(),
    vat_number: joi_1.default.string().optional(),
    state: joi_1.default.string().optional(),
    warehouseId: joi_1.default.string().optional(),
    postal_code: joi_1.default.string().optional(),
    role: joi_1.default.string().valid("superadmin", "admin").optional(),
});
exports.updateUserSchema = joi_1.default.object({
    username: joi_1.default.string().optional(),
    email: joi_1.default.string().email().optional(),
    password: joi_1.default.string().optional(),
    positionId: joi_1.default.string().optional(),
    company_name: joi_1.default.string().optional(),
    phone: joi_1.default.string().optional(),
    image_base64: joi_1.default.string().optional(),
    address: joi_1.default.string().optional(),
    vat_number: joi_1.default.string().optional(),
    warehouseId: joi_1.default.string().optional(),
    state: joi_1.default.string().optional(),
    postal_code: joi_1.default.string().optional(),
    role: joi_1.default.string().valid("superadmin", "admin").optional(),
});
