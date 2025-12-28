import mongoose, { Types, Document } from "mongoose";

export interface CashierDoc extends Document {
  name: string;
  ar_name: string;
  warehouse_id: Types.ObjectId;
  status: boolean;
  cashier_active: boolean;
  bankAccounts: Types.ObjectId[];
}

const CashierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ar_name: { type: String, required: true },
    warehouse_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    status: { type: Boolean, default: true },
    cashier_active: { type: Boolean, default: false },
    bankAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: "BankAccount" }],
  },
  { timestamps: true }
);

// ✅ Virtual للـ users بس - بإسم مختلف
CashierSchema.virtual("warehouseUsers", {
  ref: "User",
  localField: "warehouse_id",
  foreignField: "warehouseId",
  justOne: false,
});

// ❌ امسح الـ virtual بتاع bankAccounts لأنه موجود كـ field

CashierSchema.set("toJSON", { virtuals: true });
CashierSchema.set("toObject", { virtuals: true });

export const CashierModel = mongoose.model<CashierDoc>("Cashier", CashierSchema);
