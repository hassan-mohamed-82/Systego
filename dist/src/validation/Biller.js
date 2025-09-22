"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBillerSchema = exports.createBillerSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createBillerSchema = joi_1.default.object({
    image: joi_1.default.string().optional(), // Base64 أو URL
    name: joi_1.default.string().max(100).required(),
    company_name: joi_1.default.string().max(200).optional(),
    vat_number: joi_1.default.string().max(50).optional(),
    email: joi_1.default.string().email().max(150).required(),
    phone_number: joi_1.default.string().max(20).required(),
    address: joi_1.default.string().required(),
});
exports.updateBillerSchema = joi_1.default.object({
    image: joi_1.default.string().optional(),
    name: joi_1.default.string().max(100).optional(),
    company_name: joi_1.default.string().max(200).optional(),
    vat_number: joi_1.default.string().max(50).optional(),
    email: joi_1.default.string().email().max(150).optional(),
    phone_number: joi_1.default.string().max(20).optional(),
    address: joi_1.default.string().optional(),
});
