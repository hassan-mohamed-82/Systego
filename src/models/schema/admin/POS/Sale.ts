// models/Sale.ts
import mongoose, { Schema } from "mongoose";

const SaleSchema = new Schema(
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

    customer_id: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
    },

    // ✅ عميل الدين
    Due_customer_id: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
    },

    // ✅ هل فاتورة دين؟
    Due: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },

    // ✅ المبلغ المتبقي
    remaining_amount: {
      type: Number,
      default: 0,
    },

    warehouse_id: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },

    account_id: [{ type: Schema.Types.ObjectId, ref: "BankAccount" }],

    order_pending: {
      type: Number,
      enum: [0, 1],
      default: 1,
    },

    order_tax: { type: Schema.Types.ObjectId, ref: "Taxes" },
    order_discount: { type: Schema.Types.ObjectId, ref: "Discount" },
    grand_total: { type: Number, required: true },
    gift_card_id: { type: Schema.Types.ObjectId, ref: "GiftCard" },
    coupon_code: { type: String, default: "" },
    applied_coupon: { type: Boolean, default: false },
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

    shipping: { type: Number, default: 0 },
    tax_rate: { type: Number, default: 0 },
    tax_amount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paid_amount: { type: Number, default: 0 },
    note: { type: String, default: "" },

    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index للبحث السريع
SaleSchema.index({ Due: 1, Due_customer_id: 1 });
SaleSchema.index({ Due: 1, remaining_amount: 1 });

const productSalesSchema = new Schema(
  {
    sale_id: { type: Schema.Types.ObjectId, ref: "Sale", required: true },
    product_id: { type: Schema.Types.ObjectId, ref: "Product" },
    bundle_id: { type: Schema.Types.ObjectId, ref: "Pandel" },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    product_price_id: { type: Schema.Types.ObjectId, ref: "ProductPrice" },
    isGift: { type: Boolean, default: false },
    isBundle: { type: Boolean, default: false },
    options_id: [{ type: Schema.Types.ObjectId, ref: "Option" }],
  },
  { timestamps: true }
);

productSalesSchema.pre("save", function (next) {
  if (!this.product_id && !this.bundle_id) {
    return next(new Error("Either product_id or bundle_id is required"));
  }
  if (this.product_id && this.bundle_id) {
    return next(new Error("Cannot have both product_id and bundle_id"));
  }
  next();
});

export const SaleModel = mongoose.model("Sale", SaleSchema);
export const ProductSalesModel = mongoose.model("ProductSale", productSalesSchema);
