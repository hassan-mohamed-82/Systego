import mongoose, { Schema } from "mongoose";

const adjustmentSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    reference: { type: String, maxlength: 100, trim: true },
    warehouse_id: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

export const AdjustmentModel = mongoose.model("Adjustment", adjustmentSchema);