import mongoose from "mongoose";
const selectReasonSchema = new mongoose.Schema({
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const SelectReasonModel = mongoose.model("SelectReason", selectReasonSchema);