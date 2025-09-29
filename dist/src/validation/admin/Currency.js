"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCurrencySchema = exports.createCurrencySchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createCurrencySchema = joi_1.default.object({
    name: joi_1.default.string().max(100).required(),
});
exports.updateCurrencySchema = joi_1.default.object({
    name: joi_1.default.string().max(100).optional(),
});
