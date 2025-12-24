// models/Product_Warehouse.ts
import mongoose from "mongoose";

const Product_WarehouseSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    warehouseId: {  // ✅ w صغيرة
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    quantity: { type: Number, required: true, default: 0 },
    low_stock: { type: Number, default: 0 },
  },
  { timestamps: true }
);

Product_WarehouseSchema.index({ productId: 1, warehouseId: 1 }, { unique: true });

export const Product_WarehouseModel = mongoose.model("Product_Warehouse", Product_WarehouseSchema);
