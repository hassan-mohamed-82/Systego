import mongoose from "mongoose";

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
  },
  { timestamps: true }
);

// ✅ users حسب الـ warehouse
CashierSchema.virtual("users", {
  ref: "User",
  localField: "warehouse_id",   // من Cashier
  foreignField: "warehouseId",  // من User (لو الحقل عندك اسمه warehouseId)
  justOne: false,
});

// ✅ bankAccounts حسب نفس الـ warehouse
CashierSchema.virtual("bankAccounts", {
  ref: "BankAccount",
  localField: "warehouse_id",   // من Cashier
  foreignField: "warehouseId",  // من BankAccount
  justOne: false,
});

// نفعل الـ virtuals في الـ JSON
CashierSchema.set("toJSON", { virtuals: true });
CashierSchema.set("toObject", { virtuals: true });

export const CashierModel = mongoose.model("Cashier", CashierSchema);
