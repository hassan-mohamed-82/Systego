import { Schema, model } from "mongoose";

const shippingSettingsSchema = new Schema(
  {
    singletonKey: { type: String, default: "default", unique: true },
    shippingMethod: {
      type: String,
      enum: ["zone", "flat_rate", "carrier"],
      default: "zone",
    },
    flatRate: { type: Number, default: 0, min: 0 },
    carrierRate: { type: Number, default: 0, min: 0 },
    carrierId: { type: Schema.Types.ObjectId, ref: "Courier", default: null },
    freeShippingEnabled: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const ShippingSettingsModel = model("ShippingSettings", shippingSettingsSchema);
