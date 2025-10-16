"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRedeemPointSchema = exports.createRedeemPointSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createRedeemPointSchema = joi_1.default.object({
    amount: joi_1.default.number().required(),
    points: joi_1.default.number().required(),
});
exports.updateRedeemPointSchema = joi_1.default.object({
    amount: joi_1.default.number().optional(),
    points: joi_1.default.number().optional(),
});
