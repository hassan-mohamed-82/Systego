import mongoose from "mongoose";

const productPriceSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    price: { type: Number, required: true },
    code: { type: String , required: true, unique: true },
    gallery: [{ type: String }], // صور 
    quantity: { type: Number, default: 0 }, // كمية المنتج في هذا السعر
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
