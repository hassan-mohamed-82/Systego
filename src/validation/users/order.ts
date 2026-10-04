import Joi from "joi";

export const createOrderSchema = Joi.object({
  orderType: Joi.string().valid("delivery", "pickup").default("delivery"),

  warehouseId: Joi.string().hex().length(24).when("orderType", {
    is: "pickup",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  shippingAddress: Joi.alternatives()
    .try(
      // ── Option 1: String (address ID) ──
      Joi.string().hex().length(24),

      // ── Option 2: Object — Self OR Bosta ──
      Joi.object({
        // Common fields
        street: Joi.string().required(),
        buildingNumber: Joi.string().allow(""),
        floorNumber: Joi.string().allow(""),
        apartmentNumber: Joi.string().allow(""),
        uniqueIdentifier: Joi.string().allow(""),

        // ── Self fields (optional — required only for self) ──
        country: Joi.string().allow("").optional(),
        city: Joi.string().allow("").optional(),
        zone: Joi.string().allow("").optional(),

        // ── Bosta fields (optional — required only for bosta) ──
        bostaCityId: Joi.string().allow("").optional(),
        bostaCityName: Joi.string().allow("").optional(),
        bostaZoneId: Joi.string().allow("").optional(),
        bostaZoneName: Joi.string().allow("").optional(),
        bostaDistrictId: Joi.string().allow("").optional(),
        bostaDistrictName: Joi.string().allow("").optional(),
      })
        .or("city", "bostaCityId") // ✅ لازم واحد منهم على الأقل
        .messages({
          "object.missing":
            "shippingAddress must have either (city + zone) for self shipping, or (bostaCityId + bostaDistrictId) for bosta shipping",
        }),
    )
    .when("orderType", {
      is: "delivery",
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      "any.required": "Please provide a shipping address",
    }),

  paymentMethod: Joi.string().hex().length(24).required().messages({
    "any.required": "Payment method is required",
  }),

  proofImage: Joi.string().optional(),
  sessionId: Joi.string().optional(),
});
