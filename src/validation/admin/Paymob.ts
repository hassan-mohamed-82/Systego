import Joi from "joi";

export const createPaymobSchema = Joi.object({
  type: Joi.string()
    .valid("live", "test")
    .required()
    .messages({
      "string.empty": "Type is required",
      "any.required": "Type is required",
      "any.only": "Type must be either 'live' or 'test'",
    }),

  callback: Joi.string()
    .required()
    .messages({
      "string.empty": "Callback URL is required",
      "any.required": "Callback URL is required",
    }),

  api_key: Joi.string().required().messages({
    "string.empty": "API key is required",
    "any.required": "API key is required",
  }),

  iframe_id: Joi.string().required().messages({
    "string.empty": "Iframe ID is required",
    "any.required": "Iframe ID is required",
  }),

  integration_id: Joi.string().required().messages({
    "string.empty": "Integration ID is required",
    "any.required": "Integration ID is required",
  }),

  hmac_key: Joi.string().required().messages({
    "string.empty": "HMAC key is required",
    "any.required": "HMAC key is required",
  }),

  payment_method_id: Joi.string().required().messages({
    "string.empty": "Payment Method ID is required",
    "any.required": "Payment Method ID is required",
  }),
});

export const updatePaymobSchema = Joi.object({
  type: Joi.string().valid("live", "test").messages({
    "any.only": "Type must be either 'live' or 'test'",
  }),

  callback: Joi.string().uri().messages({
    "string.uri": "Callback must be a valid URL",
  }),

  api_key: Joi.string(),
  iframe_id: Joi.string(),
  integration_id: Joi.string(),
  hmac_key: Joi.string(),
  payment_method_id: Joi.string(),
});
