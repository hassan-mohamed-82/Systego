"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePopupSchema = exports.createPopupSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// Regular expressions
const arabicRegex = /^[\u0600-\u06FF\s]+$/; // Arabic letters + spaces
const englishRegex = /^[A-Za-z\s]+$/; // English letters + spaces
// ✅ Create Validation
exports.createPopupSchema = joi_1.default.object({
    title_ar: joi_1.default.string()
        .pattern(arabicRegex)
        .required()
        .messages({
        "string.empty": "Arabic title is required",
        "string.pattern.base": "Arabic title must contain only Arabic letters",
        "any.required": "Arabic title is required",
    }),
    title_En: joi_1.default.string()
        .pattern(englishRegex)
        .required()
        .messages({
        "string.empty": "English title is required",
        "string.pattern.base": "English title must contain only English letters",
        "any.required": "English title is required",
    }),
    description_ar: joi_1.default.string()
        .pattern(arabicRegex)
        .required()
        .messages({
        "string.empty": "Arabic description is required",
        "string.pattern.base": "Arabic description must contain only Arabic letters",
        "any.required": "Arabic description is required",
    }),
    description_En: joi_1.default.string()
        .pattern(englishRegex)
        .required()
        .messages({
        "string.empty": "English description is required",
        "string.pattern.base": "English description must contain only English letters",
        "any.required": "English description is required",
    }),
    image_ar: joi_1.default.string().allow("", null),
    image_En: joi_1.default.string().allow("", null),
    link: joi_1.default.string()
        .uri()
        .required()
        .messages({
        "string.empty": "Link is required",
        "string.uri": "Link must be a valid URL",
        "any.required": "Link is required",
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
    image_ar: joi_1.default.string().allow("", null),
    image_En: joi_1.default.string().allow("", null),
    link: joi_1.default.string()
        .uri()
        .messages({
        "string.uri": "Link must be a valid URL",
    }),
});
