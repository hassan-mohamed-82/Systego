import mongoose from "mongoose";

const Product_transferSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  WarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    quantity: { type: Number, required: true },
});
export const Product_transferModel = mongoose.model("Product_transfer", Product_transferSchema);
