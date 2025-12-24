import Joi from "joi";

// ✅ Arabic & English regex (more flexible)
const arabicRegex = /^[\u0600-\u06FF0-9\s.,،!؟()٪\/:-]+$/;
const englishRegex = /^[A-Za-z0-9\s.,!()/%:-]+$/;

export const createPopupSchema = Joi.object({
  title_ar: Joi.string()
    .pattern(/^[\u0600-\u06FF\s]+$/)
    .required()
    .messages({
      "string.empty": "Arabic title is required",
      "string.pattern.base": "Arabic title must contain only Arabic letters",
    }),

  title_En: Joi.string()
    .pattern(/^[A-Za-z\s]+$/)
    .required()
    .messages({
      "string.empty": "English title is required",
      "string.pattern.base": "English title must contain only English letters",
    }),

  description_ar: Joi.string()
    .pattern(arabicRegex)
    .required()
    .messages({
      "string.empty": "Arabic description is required",
      "string.pattern.base": "Arabic description must contain only Arabic letters, numbers or symbols",
    }),

  description_En: Joi.string()
    .pattern(englishRegex)
    .required()
    .messages({
      "string.empty": "English description is required",
      "string.pattern.base": "English description must contain only English letters, numbers or symbols",
    }),

  image: Joi.string().allow("", null),

  link: Joi.string()
    .uri()
    .required()
    .messages({
      "string.empty": "Link is required",
      "string.uri": "Link must be a valid URL",
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

  image: Joi.string().allow("", null),

  link: Joi.string()
    .uri()
    .messages({
      "string.uri": "Link must be a valid URL",
    }),
});
