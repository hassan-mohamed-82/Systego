// src/validation/admin/DeliveryAssignment.ts
import Joi from "joi";

const objectId = Joi.string().hex().length(24);

// ═══════════════════════════════════════════════════════════
// MANUAL ASSIGN
// ═══════════════════════════════════════════════════════════
export const manualAssignSchema = Joi.object({
  delivery_man_id: objectId.required().messages({
    "any.required": "delivery_man_id is required",
    "string.length": "delivery_man_id must be a valid ObjectId",
  }),
  notes: Joi.string().allow("").max(500).optional(),
});

// ═══════════════════════════════════════════════════════════
// UPDATE DELIVERY STATUS
// ═══════════════════════════════════════════════════════════
export const updateDeliveryStatusSchema = Joi.object({
  status: Joi.string()
    .valid("picked_up", "out_for_delivery", "delivered", "failed")
    .required()
    .messages({
      "any.required": "status is required",
      "any.only":
        "status must be one of: picked_up, out_for_delivery, delivered, failed",
    }),
  notes: Joi.string().allow("").max(500).optional(),
  failure_reason: Joi.string().allow("").max(500).optional(),
});
