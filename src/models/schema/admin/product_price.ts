import mongoose from "mongoose";

const productPriceSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    price: { type: Number, required: true },
    code: { type: String, unique: true, sparse: true }, 
    gallery: [{ type: String }],
    quantity: { type: Number, default: 0 },
    strat_quantaty: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ProductPriceModel = mongoose.model("ProductPrice", productPriceSchema);

const productPriceOptionSchema = new mongoose.Schema(
  {
    product_price_id: { type: mongoose.Schema.Types.ObjectId, ref: "ProductPrice", required: true },
    option_id: { type: mongoose.Schema.Types.ObjectId, ref: "Option", required: true },
  },
  { timestamps: true }
);

export const ProductPriceOptionModel = mongoose.model("ProductPriceOption", productPriceOptionSchema);
