import mongoose, { Schema } from "mongoose";

const WarehouseSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    ar_name: { type: String, required: true, maxlength: 100 },
    address: { type: String, required: true },
    ar_address: { type: String, required: true },
    phone: { type: String, maxlength: 20 },
    email: { type: String, maxlength: 150 },
    number_of_products: { type: Number, default: 0 },
    stock_Quantity: { type: Number, default: 0 },
    Is_Online: { type: Boolean, default: false },
    // Created/synced from Super Systego (branch list defined by the owner).
    is_managed: { type: Boolean, default: false },
    // When false, the branch was removed from the plan and is suspended:
    // the admin sees a "contact support" notice.
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const WarehouseModel = mongoose.model("Warehouse", WarehouseSchema);
