import mongoose, { Schema } from "mongoose";

const WastedSchema = new Schema(
  {
    rejected_id: [{ type: mongoose.Schema.Types.ObjectId, ref: "RejectedReason" }],
    category_id: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    product_id: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    quantity: { type: Number },
  },
  { timestamps: true }
);

export const WastedModel = mongoose.model("Wasted", WastedSchema);