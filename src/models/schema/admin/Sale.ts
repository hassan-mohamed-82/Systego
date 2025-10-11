import mongoose, { Schema } from "mongoose";


const SaleSchema = new Schema(
  {
    reference_no: { type: String, required: true, unique: true, index: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    currency_id: { type: Schema.Types.ObjectId, ref: 'Currency' },
    sale_status: { type: String, required: true, default: 'pending', enum: ['completed', 'pending', 'returned', 'draft', 'processing'] },
    order_tax: { type: Schema.Types.ObjectId, ref: 'Taxes' },
    order_discount: { type: Schema.Types.ObjectId, ref: 'Discount' },
    shipping_cost: { type: Number, default: 0 },
    grand_total: { type: Number, required: true },
    paid_amount: { type: Number, default: 0 },
    coupon_id: { type: Schema.Types.ObjectId, ref: 'Coupon' }
  },
  {
    timestamps: true,
  }
);


const productSalesSchema = new Schema({
    sale_id: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
    product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    options_id: { type: Schema.Types.ObjectId, ref: 'ProductOption' }
  },
  { timestamps: true }
);
export const SaleModel = mongoose.model("Sale", SaleSchema);
export const ProductSalesModel = mongoose.model("ProductSale", productSalesSchema);
