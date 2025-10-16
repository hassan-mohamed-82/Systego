import Joi from "joi";

// Regular expressions
const arabicRegex = /^[\u0600-\u06FF\s]+$/; // Arabic letters + spaces
const englishRegex = /^[A-Za-z\s]+$/; // English letters + spaces

// ✅ Create Validation
export const createPopupSchema = Joi.object({
  title_ar: Joi.string()
    .pattern(arabicRegex)
    .required()
    .messages({
      "string.empty": "Arabic title is required",
      "string.pattern.base": "Arabic title must contain only Arabic letters",
      "any.required": "Arabic title is required",
    }),

  title_En: Joi.string()
    .pattern(englishRegex)
    .required()
    .messages({
      "string.empty": "English title is required",
      "string.pattern.base": "English title must contain only English letters",
      "any.required": "English title is required",
    }),

  description_ar: Joi.string()
    .pattern(arabicRegex)
    .required()
    .messages({
      "string.empty": "Arabic description is required",
      "string.pattern.base": "Arabic description must contain only Arabic letters",
      "any.required": "Arabic description is required",
    }),

  description_En: Joi.string()
    .pattern(englishRegex)
    .required()
    .messages({
      "string.empty": "English description is required",
      "string.pattern.base": "English description must contain only English letters",
      "any.required": "English description is required",
    }),

  image_ar: Joi.string().allow("", null),
  image_En: Joi.string().allow("", null),

  link: Joi.string()
    .uri()
    .required()
    .messages({
      "string.empty": "Link is required",
      "string.uri": "Link must be a valid URL",
      "any.required": "Link is required",
    }),
});

// ✅ Update Validation
export const updatePopupSchema = Joi.object({
  title_ar: Joi.string()
    .pattern(arabicRegex)
    .messages({
      "string.pattern.base": "Arabic title must contain only Arabic letters",
    }),

  title_En: Joi.string()
    .pattern(englishRegex)
    .messages({
      "string.pattern.base": "English title must contain only English letters",
    }),

  description_ar: Joi.string()
    .pattern(arabicRegex)
    .messages({
      "string.pattern.base": "Arabic description must contain only Arabic letters",
    }),

  description_En: Joi.string()
    .pattern(englishRegex)
    .messages({
      "string.pattern.base": "English description must contain only English letters",
    }),

  image_ar: Joi.string().allow("", null),
  image_En: Joi.string().allow("", null),

  link: Joi.string()
    .uri()
    .messages({
      "string.uri": "Link must be a valid URL",
    }),
});
