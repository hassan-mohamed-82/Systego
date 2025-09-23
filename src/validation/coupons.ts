import Joi from "joi";

export const createCouponSchema = Joi.object({
  coupon_code: Joi.string().max(100).required(),
  type: Joi.string().valid("percentage", "flat").required(),
  amount: Joi.number().precision(2).positive().required(),
  minimum_amount: Joi.number().precision(2).min(0).default(0),
  quantity: Joi.number().integer().positive().required(),
  available: Joi.number().integer().min(0).required(),
  expired_date: Joi.date().greater("now").required(),
});

export const updateCouponSchema = Joi.object({
  coupon_code: Joi.string().max(100),
  type: Joi.string().valid("percentage", "flat"),
  amount: Joi.number().precision(2).positive(),
  minimum_amount: Joi.number().precision(2).min(0),
  quantity: Joi.number().integer().positive(),
  available: Joi.number().integer().min(0),
  expired_date: Joi.date().greater("now"),
});
