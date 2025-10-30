"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateZoneSchema = exports.createZoneSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createZoneSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    ar_name: joi_1.default.string().required(),
    cityId: joi_1.default.string().required(),
    countryId: joi_1.default.string().required(),
    cost: joi_1.default.number().min(0).default(0)
});
exports.updateZoneSchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    ar_name: joi_1.default.string().optional(),
    cityId: joi_1.default.string().optional(),
    countryId: joi_1.default.string().optional(),
    cost: joi_1.default.number().min(0).optional()
});
