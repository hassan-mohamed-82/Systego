"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBankAccountSchema = exports.createBankAccountSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createBankAccountSchema = joi_1.default.object({
    account_no: joi_1.default.string().max(100).required(),
    name: joi_1.default.string().max(100).required(),
    initial_balance: joi_1.default.number().min(0).required(),
    is_default: joi_1.default.boolean().default(false),
    note: joi_1.default.string().allow("", null),
});
exports.updateBankAccountSchema = joi_1.default.object({
    account_no: joi_1.default.string().max(100),
    name: joi_1.default.string().max(100),
    initial_balance: joi_1.default.number().min(0),
    is_default: joi_1.default.boolean(),
    note: joi_1.default.string().allow("", null),
});
