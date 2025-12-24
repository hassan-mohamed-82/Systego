"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePopupSchema = exports.createPopupSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// ✅ Arabic & English regex (more flexible)
const arabicRegex = /^[\u0600-\u06FF0-9\s.,،!؟()٪\/:-]+$/;
const englishRegex = /^[A-Za-z0-9\s.,!()/%:-]+$/;
exports.createPopupSchema = joi_1.default.object({
    title_ar: joi_1.default.string()
        .pattern(/^[\u0600-\u06FF\s]+$/)
        .required()
        .messages({
        "string.empty": "Arabic title is required",
        "string.pattern.base": "Arabic title must contain only Arabic letters",
    }),
    title_En: joi_1.default.string()
        .pattern(/^[A-Za-z\s]+$/)
        .required()
        .messages({
        "string.empty": "English title is required",
        "string.pattern.base": "English title must contain only English letters",
    }),
    description_ar: joi_1.default.string()
        .pattern(arabicRegex)
        .required()
        .messages({
        "string.empty": "Arabic description is required",
        "string.pattern.base": "Arabic description must contain only Arabic letters, numbers or symbols",
    }),
    description_En: joi_1.default.string()
        .pattern(englishRegex)
        .required()
        .messages({
        "string.empty": "English description is required",
        "string.pattern.base": "English description must contain only English letters, numbers or symbols",
    }),
    image: joi_1.default.string().allow("", null),
    link: joi_1.default.string()
        .uri()
        .required()
        .messages({
        "string.empty": "Link is required",
        "string.uri": "Link must be a valid URL",
    }),
});
// ✅ Update Validation
exports.updatePopupSchema = joi_1.default.object({
    title_ar: joi_1.default.string()
        .pattern(arabicRegex)
        .messages({
        "string.pattern.base": "Arabic title must contain only Arabic letters",
    }),
    title_En: joi_1.default.string()
        .pattern(englishRegex)
        .messages({
        "string.pattern.base": "English title must contain only English letters",
    }),
    description_ar: joi_1.default.string()
        .pattern(arabicRegex)
        .messages({
        "string.pattern.base": "Arabic description must contain only Arabic letters",
    }),
    description_En: joi_1.default.string()
        .pattern(englishRegex)
        .messages({
        "string.pattern.base": "English description must contain only English letters",
    }),
    image: joi_1.default.string().allow("", null),
    link: joi_1.default.string()
        .uri()
        .messages({
        "string.uri": "Link must be a valid URL",
    }),
});
