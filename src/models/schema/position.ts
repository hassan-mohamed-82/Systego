import mongoose, { Schema } from "mongoose";

const PositionSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const PositionModel = mongoose.model("Position", PositionSchema);
