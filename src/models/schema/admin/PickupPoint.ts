import { Schema, model } from "mongoose";

/**
 * A pickup point shown to online (ecommerce) customers when choosing where to
 * collect their order. It can be created standalone (with a location picked on
 * the map) or copied from an existing branch.
 */
const pickupPointSchema = new Schema(
  {
    name: { type: String, required: true },
    ar_name: { type: String, default: "" },
    address: { type: String, default: "" },
    ar_address: { type: String, default: "" },
    phone: { type: String, default: "" },
    lat: { type: Number },
    lng: { type: Number },
    // When the pickup point was created from a branch, keep the link so the
    // owner can tell where it came from.
    branch_id: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      default: null,
    },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const PickupPointModel = model("PickupPoint", pickupPointSchema);
