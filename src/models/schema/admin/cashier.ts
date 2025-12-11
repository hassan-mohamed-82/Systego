import mongoose, { Types } from "mongoose";

export interface CashierDoc extends Document {
  name: string;
  ar_name: string;
  warehouse_id: Types.ObjectId;
  status: boolean;
  cashier_active: boolean;
  cashier_id: Types.ObjectId;

  // virtuals:
  bankAccounts?: any[]; // أو تعرف IBankAccount لو عندك
  users?: any[];
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

    status: { type: Boolean, default: true },        // موجود ولا لأ في السيستم
    cashier_active: { type: Boolean, default: false }, //حد مستخدمه ولا لا  

      cashier_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Cashier', required: true },

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
