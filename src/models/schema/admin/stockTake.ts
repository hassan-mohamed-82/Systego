import mongoose, { Schema } from "mongoose";

const StocktakeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    type: { type: String, enum: ["full", "partial"], required: true },
    mode: { type: String, enum: ["manual", "excel"], required: true },
    status: {
      type: String,
      enum: ["processing", "completed", "cancelled"],
      default: "processing",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const StocktakeModel = mongoose.model("Stocktake", StocktakeSchema);