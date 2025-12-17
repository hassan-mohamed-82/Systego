// models/Return.ts
import mongoose, { Schema } from "mongoose";

const ReturnItemSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: "Product" },
  product_price_id: { type: Schema.Types.ObjectId, ref: "ProductPrice" },
  bundle_id: { type: Schema.Types.ObjectId, ref: "Pandel" },
  original_quantity: { type: Number, required: true },
  returned_quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  reason: { type: String, default: "" },
});

const ReturnSchema = new Schema(
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

    sale_id: {
      type: Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
    },

    sale_reference: {
      type: String,
      required: true,
    },

    customer_id: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
    },

    warehouse_id: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },

    cashier_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    shift_id: {
      type: Schema.Types.ObjectId,
      ref: "CashierShift",
      required: true,
    },

    items: [ReturnItemSchema],

    total_amount: {
      type: Number,
      required: true,
    },

    refund_method: {
      type: String,
      enum: ["cash", "card", "store_credit", "original_method"],
      default: "original_method",
    },

    refund_account_id: {
      type: Schema.Types.ObjectId,
      ref: "BankAccount",
    },

    note: {
      type: String,
      default: "",
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

ReturnSchema.index({ sale_id: 1 });
ReturnSchema.index({ customer_id: 1 });
ReturnSchema.index({ reference: 1 });
ReturnSchema.index({ sale_reference: 1 });

export const ReturnModel = mongoose.model("Return", ReturnSchema);
