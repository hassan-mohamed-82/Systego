// src/models/schema/admin/deliveryMan.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IDeliveryMan extends Document {
  name: string;
  email: string;
  password: string;
  phone_number: string;
  status: "active" | "inactive";
  photo: string;

  // ✅ جديد
  currentOrders: mongoose.Types.ObjectId[];
  completedOrders: number;
  failedOrders: number;
  totalEarnings: number;
  maxConcurrentOrders: number;
}

const DeliveryMan = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    phone_number: { type: String, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    photo: { type: String },

    // ✅ الجديد — للـ Auto-assignment
    currentOrders: [
      { type: Schema.Types.ObjectId, ref: "Orders", default: [] },
    ],
    completedOrders: { type: Number, default: 0 },
    failedOrders: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    maxConcurrentOrders: { type: Number, default: 10, min: 1 },
  },
  { timestamps: true },
);

// ✅ فهرس للبحث السريع
DeliveryMan.index({ status: 1 });

export const DeliveryManModel = mongoose.model<IDeliveryMan>(
  "DeliveryMan",
  DeliveryMan,
);
