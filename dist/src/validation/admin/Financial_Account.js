"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBankAccountSchema = exports.createBankAccountSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createBankAccountSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    warehouseId: joi_1.default.array().items(joi_1.default.string().hex().length(24)).required(),
    image: joi_1.default.string().optional(),
    balance: joi_1.default.number().optional(),
    description: joi_1.default.string().optional(),
    status: joi_1.default.boolean().optional(),
    in_POS: joi_1.default.boolean().optional(),
});
exports.updateBankAccountSchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    warehouseId: joi_1.default.array().items(joi_1.default.string().hex().length(24)).optional(),
    image: joi_1.default.string().optional(),
    balance: joi_1.default.number().optional(),
    description: joi_1.default.string().optional(),
    status: joi_1.default.boolean().optional(),
    in_POS: joi_1.default.boolean().optional(),
});
