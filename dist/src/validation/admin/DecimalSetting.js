"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDecimalSettingSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.updateDecimalSettingSchema = joi_1.default.object({
    decimal_places: joi_1.default.number().valid(0, 1, 2, 3).required(),
});
