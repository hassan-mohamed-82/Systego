"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBrandSchema = exports.createBrandSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createBrandSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    ar_name: joi_1.default.string().required(),
    logo: joi_1.default.string().optional(),
});
exports.updateBrandSchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    ar_name: joi_1.default.string().optional(),
    logo: joi_1.default.string().optional(),
});
