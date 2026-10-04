// src/models/schema/users/Address.ts
import mongoose, { Schema, model } from "mongoose";

const addressSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    // ═══════════════════════════════════════════════════════════
    // Self Shipping
    // ═══════════════════════════════════════════════════════════
    city: { type: Schema.Types.ObjectId, ref: "City", default: null },
    zone: { type: Schema.Types.ObjectId, ref: "Zone", default: null },
    country: { type: Schema.Types.ObjectId, ref: "Country", default: null },

    // ═══════════════════════════════════════════════════════════
    // 🆕 Bosta Shipping
    // ═══════════════════════════════════════════════════════════
    bostaCityId: { type: String, default: "" },
    bostaCityName: { type: String, default: "" },
    bostaZoneId: { type: String, default: "" },
    bostaZoneName: { type: String, default: "" },
    bostaDistrictId: { type: String, default: "" },
    bostaDistrictName: { type: String, default: "" },

    // ═══════════════════════════════════════════════════════════
    // Common Fields
    // ═══════════════════════════════════════════════════════════
    street: { type: String, default: "" },
    buildingNumber: { type: String, default: "" },
    floorNumber: { type: String, default: "" },
    apartmentNumber: { type: String, default: "" },
    uniqueIdentifier: { type: String, default: "" },
    notes: { type: String, default: "" },

    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const AddressModel = model("Address", addressSchema);
