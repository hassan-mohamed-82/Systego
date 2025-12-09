import mongoose from "mongoose";

const CashierSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        ar_name: { type: String, required: true },
        warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
        status: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const CashierModel = mongoose.model("Cashier", CashierSchema);