import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true,unique:true },
    ar_name: { type: String, required: true },
    ar_description: { type: String, required: true },
    image: { type: String },
    categoryId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
    product_unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit" },
    sale_unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit" },
    purchase_unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit" },
    code: { type: String, unique: true, sparse: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    description: { type: String },
    exp_ability: { type: Boolean, default: false },
   // date_of_expiery: { type: Date },
    minimum_quantity_sale: { type: Number, default: 1 },
    low_stock: { type: Number },
    whole_price: { type: Number },
    start_quantaty: { type: Number },
    cost: { type: Number, },
    taxesId: { type: mongoose.Schema.Types.ObjectId, ref: "Taxes" },
    product_has_imei: { type: Boolean, default: false },
    different_price: { type: Boolean, default: false }, 
    show_quantity: { type: Boolean, default: true },
    maximum_to_show: { type: Number },
    gallery_product: [{ type: String }],
    is_featured: { type: Boolean, default: false }

  },
  { timestamps: true }
);

export const ProductModel = mongoose.model("Product", productSchema);
