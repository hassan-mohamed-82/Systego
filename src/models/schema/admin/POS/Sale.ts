import mongoose, { Schema } from "mongoose";

const SaleSchema = new Schema(
  {
    reference: {
      type: String,
      maxlength: 100,
      trim: true,
      default: function () {
        const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        return `SALE-${datePart}-${randomPart}`;
      },
    },

    // 👇 زي ما هو
    customer_id: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
    },

    warehouse_id: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },

    account_id: [
      { type: Schema.Types.ObjectId, ref: "BankAccount" },
    ],

    order_pending: {
      type: Number,
      enum: [0, 1],          // 0: pending, 1: completed
      default: 0,
    },

    order_tax:      { type: Schema.Types.ObjectId, ref: "Taxes" },
    order_discount: { type: Schema.Types.ObjectId, ref: "Discount" },
    grand_total:    { type: Number, required: true },
    coupon_id:      { type: Schema.Types.ObjectId, ref: "Coupon" },
    gift_card_id:   { type: Schema.Types.ObjectId, ref: "GiftCard" },

    // 👇 مهمين عشان الشيفت و التقارير
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
  },
  { timestamps: true }
);

const productSalesSchema = new Schema(
  {
    sale_id:    { type: Schema.Types.ObjectId, ref: "Sale", required: true },
    product_id: { type: Schema.Types.ObjectId, ref: "Product" },
    bundle_id:  { type: Schema.Types.ObjectId, ref: "Pandel" },
    quantity:   { type: Number, required: true, min: 1 },
    price:      { type: Number, required: true, min: 0 },
    subtotal:   { type: Number, required: true, min: 0 },
    options_id: [{ type: Schema.Types.ObjectId, ref: "Option" }],
    isGift:     { type: Boolean, default: false },
    isBundle:   { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Validation للـ product/bundle
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
