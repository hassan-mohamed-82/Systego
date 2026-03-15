import Joi from "joi";

export const updateDecimalSettingSchema = Joi.object({
  decimal_places: Joi.number().valid(0, 1, 2, 3).required(),
});
