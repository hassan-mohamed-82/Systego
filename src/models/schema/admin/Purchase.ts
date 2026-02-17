import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPurchase extends Document {
  _id: Types.ObjectId;
  reference: string;
  date: Date;
  warehouse_id: Types.ObjectId;
  supplier_id: Types.ObjectId;
  tax_id?: Types.ObjectId;
  receipt_img?: string;
  payment_status: "partial" | "full" | "later";
  exchange_rate: number;
  total: number;
  discount: number;
  shipping_cost: number;
  grand_total: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseSchema = new Schema<IPurchase>(
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
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    tax_id: { type: mongoose.Schema.Types.ObjectId, ref: "Taxes" },
    receipt_img: { type: String },
    payment_status: {
      type: String,
      enum: ["partial", "full", "later"],
    },
    exchange_rate: { type: Number, required: true, default: 1 },
    total: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    shipping_cost: { type: Number, default: 0 },
    grand_total: { type: Number, required: true },
    note: { type: String },
  },
  { timestamps: true }
);

PurchaseSchema.virtual("items", {
  ref: "PurchaseItem",
  localField: "_id",
  foreignField: "purchase_id",
});

PurchaseSchema.virtual("invoices", {
  ref: "PurchaseInvoice",
  localField: "_id",
  foreignField: "purchase_id",
});

PurchaseSchema.virtual("installments", {
  ref: "PurchaseInstallment",
  localField: "_id",
  foreignField: "purchase_id",
});

PurchaseSchema.virtual("duePayments", {
  ref: "PurchaseDuePayment",
  localField: "_id",
  foreignField: "purchase_id",
});

PurchaseSchema.set("toObject", { virtuals: true });
PurchaseSchema.set("toJSON", { virtuals: true });

export const PurchaseModel = mongoose.model<IPurchase>("Purchase", PurchaseSchema);