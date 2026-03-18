import Joi from "joi";

const objectId = Joi.string().hex().length(24);

export const updateShippingSettingsSchema = Joi.object({
  shippingMethod: Joi.string().valid("zone", "flat_rate", "carrier").required(),
  flatRate: Joi.when("shippingMethod", {
    is: "flat_rate",
    then: Joi.number().min(0).required(),
    otherwise: Joi.forbidden(),
  }),
  carrierRate: Joi.when("shippingMethod", {
    is: "carrier",
    then: Joi.number().min(0).required(),
    otherwise: Joi.forbidden(),
  }),
  carrierId: Joi.when("shippingMethod", {
    is: "carrier",
    then: objectId.allow(null).optional(),
    otherwise: Joi.forbidden(),
  }),
  freeShippingEnabled: Joi.boolean().optional(),
});

export const updateFreeShippingProductsSchema = Joi.object({
  productIds: Joi.array().items(objectId).required(),
});
