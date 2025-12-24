import mongoose, { Schema } from "mongoose";

const PurchaseSchema = new Schema(
  {
    reference: {
      type: String,
      trim: true,
      unique: true,
      maxlength: 8,
      default: function () {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const datePart = `${month}${day}`;
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        return `${datePart}${randomPart}`;
      },
    },
    date: { type: Date, required: true, default: Date.now },
    warehouse_id: [{ type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" }],
    supplier_id: [{ type: mongoose.Schema.Types.ObjectId, ref: "Supplier" }],
    // currency_id: [{ type: mongoose.Schema.Types.ObjectId, ref: "Currency" }],
    tax_id: [{ type: mongoose.Schema.Types.ObjectId, ref: "Taxes" }],
    receipt_img: { type: String },
    payment_status: {
      type: String,
      enum: ["pending", "partial", "full", "later"],
      default: "pending",
    },
    exchange_rate: { type: Number, required: true, default: 1 },
    subtotal: { type: Number, required: true },
    shiping_cost: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    note: { type: String } //✅ جديد
  },
  { timestamps: true }
);

// في VariationSchema
PurchaseSchema.virtual("items", {
  ref: "PurchaseItem",
  localField: "_id",
  foreignField: "purchase_id",
});

// في VariationSchema
PurchaseSchema.virtual("invoices", {
  ref: "PurchaseInvoice",
  localField: "_id",
  foreignField: "purchase_id",
});

// في VariationSchema
PurchaseSchema.virtual("duePayments", {
  ref: "PurchaseDuePayment",
  localField: "_id",
  foreignField: "purchase_id",
});

export const PurchaseModel = mongoose.model("Purchase", PurchaseSchema);