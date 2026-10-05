// src/validation/admin/Shipping.ts
import Joi from "joi";

const objectId = Joi.string().hex().length(24);

export const updateShippingSettingsSchema = Joi.object({
  activeMethod: Joi.string().valid("self", "bosta"),

  self: Joi.object({
    enabled: Joi.boolean(),
    method: Joi.string().valid("zone", "flat_rate"),
    flatRate: Joi.number().min(0),
  }),

  bosta: Joi.object({
    enabled: Joi.boolean(),
    apiKey: Joi.string().allow(""),
    baseUrl: Joi.string().uri(),
    environment: Joi.string().valid("staging", "production"),

    pickup: Joi.object({
      firstName: Joi.string().allow(""),
      lastName: Joi.string().allow(""),
      phone: Joi.string().allow(""),
      email: Joi.string().email().allow(""),
      city: Joi.string().allow(""),
      cityId: Joi.string().allow(""),
      zoneId: Joi.string().allow(""),
      districtId: Joi.string().allow(""),
      firstLine: Joi.string().allow(""),
      secondLine: Joi.string().allow(""),
      buildingNumber: Joi.alternatives()
        .try(Joi.string(), Joi.number())
        .allow(""),
      floor: Joi.alternatives().try(Joi.string(), Joi.number()).allow(""),
      apartment: Joi.alternatives().try(Joi.string(), Joi.number()).allow(""),
    }),

    defaults: Joi.object({
      packageType: Joi.string(),
      size: Joi.string(),
      weight: Joi.number().min(0.1),
      itemsCount: Joi.number().min(1),
      description: Joi.string(),
    }),

    codEnabled: Joi.boolean(),
    webhookUrl: Joi.string().uri().allow(""),
    webhookSecret: Joi.string().allow(""),

    // 🆕 Shipping Markup
    shippingMarkup: Joi.number().min(0),
    shippingMarkupType: Joi.string().valid("fixed", "percentage"),
  }),

  freeShippingEnabled: Joi.boolean(),
}).min(1);

export const updateFreeShippingProductsSchema = Joi.object({
  productIds: Joi.array().items(objectId).required(),
});

export const createBostaDeliverySchema = Joi.object({
  order_id: Joi.string().required(),
  receiver: Joi.object({
    firstName: Joi.string().allow(""),
    lastName: Joi.string().allow(""),
    phone: Joi.string().required(),
    email: Joi.string().email().allow(""),
  }).optional(),
  dropOffAddress: Joi.object({
    city: Joi.string().required(),
    zoneId: Joi.string().required(),
    districtId: Joi.string().required(),
    firstLine: Joi.string().required(),
    secondLine: Joi.string().allow(""),
    buildingNumber: Joi.alternatives()
      .try(Joi.string(), Joi.number())
      .allow(""),
    floor: Joi.alternatives().try(Joi.string(), Joi.number()).allow(""),
    apartment: Joi.alternatives().try(Joi.string(), Joi.number()).allow(""),
  }).required(),
  cod: Joi.number().min(0).optional(),
  weight: Joi.number().min(0.1).optional(),
  notes: Joi.string().allow("").optional(),
  allowToOpenPackage: Joi.boolean().optional(),
});

export const bulkCreateBostaDeliveriesSchema = Joi.object({
  orders: Joi.array()
    .items(
      Joi.object({
        order_id: Joi.string().required(),
        receiver: Joi.object({
          firstName: Joi.string().allow(""),
          lastName: Joi.string().allow(""),
          phone: Joi.string().required(),
          email: Joi.string().email().allow(""),
        }).optional(),
        dropOffAddress: Joi.object({
          city: Joi.string().required(),
          zoneId: Joi.string().required(),
          districtId: Joi.string().required(),
          firstLine: Joi.string().required(),
          secondLine: Joi.string().allow(""),
          buildingNumber: Joi.alternatives()
            .try(Joi.string(), Joi.number())
            .allow(""),
          floor: Joi.alternatives().try(Joi.string(), Joi.number()).allow(""),
          apartment: Joi.alternatives()
            .try(Joi.string(), Joi.number())
            .allow(""),
        }).required(),
        cod: Joi.number().min(0).optional(),
        weight: Joi.number().min(0.1).optional(),
        notes: Joi.string().allow("").optional(),
      }),
    )
    .min(1)
    .max(50)
    .required(),
});

export const createBostaReturnSchema = Joi.object({
  order_id: Joi.string().required(),
  type: Joi.number().valid(10, 20, 30, 40, 50).optional(),
  dropOffAddress: Joi.object({
    city: Joi.string().allow(""),
    zoneId: Joi.string().allow(""),
    districtId: Joi.string().allow(""),
    firstLine: Joi.string().allow(""),
    secondLine: Joi.string().allow(""),
    buildingNumber: Joi.alternatives()
      .try(Joi.string(), Joi.number())
      .allow(""),
    floor: Joi.alternatives().try(Joi.string(), Joi.number()).allow(""),
    apartment: Joi.alternatives().try(Joi.string(), Joi.number()).allow(""),
  }).optional(),
  weight: Joi.number().min(0.1).optional(),
  notes: Joi.string().allow("").optional(),
  allowToOpenPackage: Joi.boolean().optional(),
});
