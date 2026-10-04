// src/models/schema/admin/BostaShipment.ts
import mongoose, { Schema, model } from "mongoose";

const bostaShipmentSchema = new Schema(
  {
    superadminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    relatedModel: {
      type: String,
      enum: ["Order", "Sale"],
      required: true,
      index: true,
    },
    relatedId: {
      type: String,
      required: true,
      index: true,
    },

    // ✅ نوع الشحنة: 10 = Send, 20 = Return
    type: { type: Number, default: 10, index: true },

    deliveryId: { type: String, default: null, index: true },
    trackingNumber: { type: String, default: null, index: true },
    awb: { type: String, default: null },

    status: { type: String, default: null, index: true },
    statusCode: { type: Number, default: null },

    labelUrl: { type: String, default: null },

    cod: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },

    receiver: {
      firstName: { type: String, default: "" },
      lastName: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
    },

    dropOffAddress: {
      city: { type: String, default: "" },
      zoneId: { type: String, default: "" },
      districtId: { type: String, default: "" },
      firstLine: { type: String, default: "" },
      secondLine: { type: String, default: "" },
      buildingNumber: { type: String, default: "" },
      floor: { type: String, default: "" },
      apartment: { type: String, default: "" },
    },

    weight: { type: Number, default: 1 },
    itemsCount: { type: Number, default: 1 },
    description: { type: String, default: "" },
    notes: { type: String, default: "" },

    // ═══════════════════════════════════════════════════════════
    // 🆕 Pickup Info — طلب استلام من الفرع
    // ═══════════════════════════════════════════════════════════
    pickup: {
      pickupId: { type: String, default: null, index: true },
      scheduledDate: { type: String, default: null },
      scheduledTimeSlot: {
        from: { type: String, default: null },
        to: { type: String, default: null },
      },
      status: { type: String, default: null },
      contactPerson: {
        firstName: { type: String, default: "" },
        lastName: { type: String, default: "" },
        phone: { type: String, default: "" },
        email: { type: String, default: "" },
      },
      notes: { type: String, default: "" },
      createdAt: { type: Date, default: null },
      rawResponse: { type: Schema.Types.Mixed, default: null },
    },

    // ═══════════════════════════════════════════════════════════
    // ✅ تاريخ التتبع — كل snapshot من Bosta بيتحفظ هنا
    // ═══════════════════════════════════════════════════════════
    trackingHistory: [
      {
        status: { type: String, default: null },
        statusCode: { type: Number, default: null },
        snapshotAt: { type: Date, default: Date.now },
        data: { type: Schema.Types.Mixed, default: null },
      },
    ],

    lastSyncAt: { type: Date, default: null },
    lastTrackAt: { type: Date, default: null },
    rawResponse: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

// ✅ فهرس مركب: كل أوردر ممكن يكون ليه Send + Return
// عشان كده مش unique على relatedId لوحده
bostaShipmentSchema.index(
  { relatedModel: 1, relatedId: 1, type: 1 },
  { unique: true },
);

export const BostaShipmentModel = model("BostaShipment", bostaShipmentSchema);
