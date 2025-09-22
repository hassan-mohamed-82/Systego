"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCourierSchema = exports.createCourierSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createCourierSchema = joi_1.default.object({
    name: joi_1.default.string().max(100).required(),
    phone_number: joi_1.default.string().max(20).required(),
    address: joi_1.default.string().required(),
});
exports.updateCourierSchema = joi_1.default.object({
    name: joi_1.default.string().max(100).optional(),
    phone_number: joi_1.default.string().max(20).optional(),
    address: joi_1.default.string().optional(),
});
