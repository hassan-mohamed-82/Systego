"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePandelSchema = exports.createPandelSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createPandelSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    startdate: joi_1.default.date().required(),
    enddate: joi_1.default.date().required(),
    status: joi_1.default.boolean(),
    images: joi_1.default.array().items(joi_1.default.string().base64()).required(),
    productsId: joi_1.default.array().items(joi_1.default.string().hex().length(24)).required().min(2),
    price: joi_1.default.number().required(),
});
exports.updatePandelSchema = joi_1.default.object({
    name: joi_1.default.string(),
    startdate: joi_1.default.date(),
    enddate: joi_1.default.date(),
    status: joi_1.default.boolean(),
    images: joi_1.default.array().items(joi_1.default.string().base64()),
    productsId: joi_1.default.array().items(joi_1.default.string().hex().length(24)),
    price: joi_1.default.number(),
});
