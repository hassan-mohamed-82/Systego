import mongoose, { Schema } from "mongoose";

const PurchaseItemSchema = new Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    product_id: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    category_id: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    purchase_id: [{ type: mongoose.Schema.Types.ObjectId, ref: "Purchase" }],
    warehouse_id: [{ type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" }],
    quantity: { type: Number, required: true },
    unit_cost: { type: Number, required: true },
    discount: { type: Number, required: true },
    tax: { type: Number, required: true },
    subtotal: { type: Number, required: true },
  },
  { timestamps: true }
);
 
// في VariationSchema
PurchaseItemSchema.virtual("options", {
  ref: "PurchaseItemOption",
  localField: "_id",
  foreignField: "purchase_item_id",
}); 

export const PurchaseItemModel = mongoose.model("PurchaseItem", PurchaseItemSchema);