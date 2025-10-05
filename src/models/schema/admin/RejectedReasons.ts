import mongoose, { Schema } from "mongoose";

const RejectedReasonSchema = new Schema(
  {
    name: { type: String, required: true},
  },
  { timestamps: true }
);

export const RejectedReasonModel = mongoose.model("RejectedReason", RejectedReasonSchema);