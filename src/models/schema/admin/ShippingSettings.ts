// src/models/schema/admin/ShippingSettings.ts
import mongoose, { Schema, model } from "mongoose";

// ═══════════════════════════════════════════════════════════
// Bosta Address Schema
// ═══════════════════════════════════════════════════════════
const bostaAddressSchema = new Schema(
  {
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    city: { type: String, default: "" }, // اسم المدينة
    cityId: { type: String, default: "" }, // Bosta city ID
    zoneId: { type: String, default: "" },
    districtId: { type: String, default: "" },
    firstLine: { type: String, default: "" },
    secondLine: { type: String, default: "" },
    buildingNumber: { type: String, default: "" },
    floor: { type: String, default: "" },
    apartment: { type: String, default: "" },

    // 🆕 Business Location — لو حساب Bosta فيه فروع محددة
    businessLocationId: { type: String, default: "" },

    // 🆕 بيانات التواصل الافتراضية للـ pickup
    pickupContactName: { type: String, default: "" },
    pickupContactPhone: { type: String, default: "" },

    // 🆕 الوقت الافتراضي للـ pickup
    defaultPickupTimeSlot: {
      from: { type: String, default: "10:00" },
      to: { type: String, default: "14:00" },
    },
  },
  { _id: false },
);

// ═══════════════════════════════════════════════════════════
// Bosta Config
// ═══════════════════════════════════════════════════════════
const bostaConfigSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    apiKey: { type: String, default: "", trim: true },
    baseUrl: { type: String, default: "https://app.bosta.co/api/v2" },
    environment: {
      type: String,
      enum: ["staging", "production"],
      default: "production",
    },

    pickup: { type: bostaAddressSchema, default: () => ({}) },

    defaults: {
      packageType: { type: String, default: "Parcel" },
      size: { type: String, default: "MEDIUM" },
      weight: { type: Number, default: 1, min: 0.1 },
      itemsCount: { type: Number, default: 1, min: 1 },
      description: { type: String, default: "Order" },
    },

    codEnabled: { type: Boolean, default: true },
    webhookUrl: { type: String, default: "" },
    webhookSecret: { type: String, default: "" },

    // 🆕 إعدادات الـ pickup التلقائي
    autoCreatePickup: { type: Boolean, default: true },
    pickupLeadDays: { type: Number, default: 0, min: 0 }, // كام يوم بعد النهاردة

    lastTestedAt: { type: Date, default: null },
    lastTestStatus: {
      type: String,
      enum: ["success", "failed", "untested"],
      default: "untested",
    },
  },
  { _id: false },
);

// ═══════════════════════════════════════════════════════════
// Self Shipping Config
// ═══════════════════════════════════════════════════════════
const selfConfigSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    method: {
      type: String,
      enum: ["zone", "flat_rate"],
      default: "zone",
    },
    flatRate: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

// ═══════════════════════════════════════════════════════════
// Main Schema
// ═══════════════════════════════════════════════════════════
const shippingSettingsSchema = new Schema(
  {
    superadminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    activeMethod: {
      type: String,
      enum: ["self", "bosta"],
      default: "self",
    },

    self: { type: selfConfigSchema, default: () => ({}) },
    bosta: { type: bostaConfigSchema, default: () => ({}) },

    freeShippingEnabled: { type: Boolean, default: false },

    singletonKey: { type: String, default: undefined, index: true },
  },
  { timestamps: true },
);

export const ShippingSettingsModel = model(
  "ShippingSettings",
  shippingSettingsSchema,
);
