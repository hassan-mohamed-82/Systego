import mongoose, { Document, Schema } from "mongoose";

export interface IDeliveryMan extends Document {
  name: string;
  email: string;
  password: string;
  phone_number: string;
  status: "active" | "inactive";
  photo: string;
}

const DeliveryMan = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    phone_number: { type: String, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    photo: { type: String },
  },
  { timestamps: true },
);

export const DeliveryManModel = mongoose.model<IDeliveryMan>(
  "DeliveryMan",
  DeliveryMan,
);
