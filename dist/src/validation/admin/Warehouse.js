"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWarehouseSchema = exports.createWarehouseSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createWarehouseSchema = joi_1.default.object({
    name: joi_1.default.string().max(100).required(),
    address: joi_1.default.string().required(),
    phone: joi_1.default.string().max(20).required(),
    email: joi_1.default.string().email().max(150).required(),
});
exports.updateWarehouseSchema = joi_1.default.object({
    name: joi_1.default.string().max(100).optional(),
    address: joi_1.default.string().optional(),
    phone: joi_1.default.string().max(20).optional(),
    email: joi_1.default.string().email().max(150).optional(),
});
