// src/models/PurchaseItemOption.ts

import mongoose, { Schema } from "mongoose";

const PurchaseItemOptionSchema = new Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    purchase_item_id: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseItem" },
    product_price_id: { type: mongoose.Schema.Types.ObjectId, ref: "ProductPrice" }, // ✅ إضافة
    option_id: { type: mongoose.Schema.Types.ObjectId, ref: "Option" },
    quantity: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const PurchaseItemOptionModel = mongoose.model("PurchaseItemOption", PurchaseItemOptionSchema);
