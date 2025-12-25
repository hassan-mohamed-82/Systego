import mongoose, { Schema } from "mongoose";

const PurchaseItemOptionSchema = new Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    purchase_item_id: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseItem" },
    option_id: { type: mongoose.Schema.Types.ObjectId, ref: "Option" },
  },
  { timestamps: true }
);

export const PurchaseItemOptionModel = mongoose.model("PurchaseItemOption", PurchaseItemOptionSchema);