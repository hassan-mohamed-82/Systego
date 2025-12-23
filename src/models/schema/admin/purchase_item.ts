import mongoose, { Schema } from "mongoose";

const PurchaseItemSchema = new Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    product_price_id: { type: Schema.Types.ObjectId, ref: "ProductPrice" },
    material_id: { type: mongoose.Schema.Types.ObjectId, ref: "Material" }, // ✅ جديد
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    date_of_expiery: { type: Date }, // ✅ جديد
    purchase_id: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase" },
    patch_number: { type: String },
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    quantity: { type: Number, required: true },
    unit_cost: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    item_type: {
      type: String,
      enum: ["product", "material"],
      default: "product",
    }, // ✅ جديد
  },
  { timestamps: true }
);

// Validation
PurchaseItemSchema.pre("save", function (next) {
  if (!this.product_id && !this.material_id) {
    return next(new Error("Either product_id or material_id is required"));
  }
  if (this.product_id && this.material_id) {
    return next(new Error("Cannot have both product_id and material_id"));
  }
  next();
});

PurchaseItemSchema.virtual("options", {
  ref: "PurchaseItemOption",
  localField: "_id",
  foreignField: "purchase_item_id",
});

export const PurchaseItemModel = mongoose.model("PurchaseItem", PurchaseItemSchema);