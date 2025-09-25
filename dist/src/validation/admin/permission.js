"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePositionWithRolesAndActionsSchema = exports.createPositionWithRolesAndActionsSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createPositionWithRolesAndActionsSchema = joi_1.default.object({
    name: joi_1.default.string().min(3).max(50).required(),
    roles: joi_1.default.array().items(joi_1.default.object({
        name: joi_1.default.string().min(3).max(50).required(),
        actions: joi_1.default.array()
            .items(joi_1.default.string().valid("add", "update", "delete", "get"))
            .required(),
    })).required(),
});
exports.updatePositionWithRolesAndActionsSchema = joi_1.default.object({
    name: joi_1.default.string().min(3).max(50), // مش required هنا
    roles: joi_1.default.array().items(joi_1.default.object({
        name: joi_1.default.string().min(3).max(50),
        actions: joi_1.default.array().items(joi_1.default.string().valid("add", "update", "delete", "get")),
    })),
});
