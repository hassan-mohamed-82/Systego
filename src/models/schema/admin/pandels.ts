// models/schema/admin/pandels.ts
import mongoose from "mongoose";

const pandelProductSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productPriceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductPrice",
    default: null, // null = الكاشير يختار، ID = محدد من الأدمن
  },
  quantity: {
    type: Number,
    default: 1,
  },
});

const pandelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    startdate: { type: Date, required: true },
    enddate: { type: Date, required: true },
    status: { type: Boolean, default: true },
    images: [{ type: String }],
    products: [pandelProductSchema], // ✅ الجديد
    price: { type: Number, required: true },
  },
  { timestamps: true }
);

export const PandelModel = mongoose.model("Pandel", pandelSchema);
