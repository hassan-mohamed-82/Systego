"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateZoneSchema = exports.createZoneSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createZoneSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    city: joi_1.default.string().required(),
    shippingCost: joi_1.default.number().min(0).default(0),
    Warehouse: joi_1.default.string().required()
});
exports.updateZoneSchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    city: joi_1.default.string().optional(),
    shippingCost: joi_1.default.number().min(0).optional(),
    Warehouse: joi_1.default.string().optional()
});
