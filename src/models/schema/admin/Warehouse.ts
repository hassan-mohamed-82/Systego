import mongoose, { Schema } from "mongoose";

const WarehouseSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    address: { type: String, required: true },
    phone: { type: String, maxlength: 20 },
    email: { type: String, maxlength: 150 },
    number_of_products: { type: Number, default: 0 },
    stock_Quantity: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const WarehouseModel = mongoose.model("Warehouse", WarehouseSchema);
