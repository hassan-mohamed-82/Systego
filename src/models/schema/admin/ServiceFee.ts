import mongoose, { Schema, Document } from "mongoose";

export interface IServiceFee extends Document {
  title: string;
  amount: number;
  type: "fixed" | "percentage";
  module: "online" | "pos";
  warehouseId?: mongoose.Types.ObjectId;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceFeeSchema = new Schema<IServiceFee>(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["fixed", "percentage"], required: true },
    module: { type: String, enum: ["online", "pos"], required: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", default: null },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ServiceFeeModel = mongoose.model<IServiceFee>("ServiceFee", ServiceFeeSchema);
