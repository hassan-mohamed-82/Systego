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

// 👇 Virtual: يجيب كل الـ Users اللي عندهم نفس warehouse_id
CashierSchema.virtual("users", {
  ref: "User",                // اسم الموديل
  localField: "warehouse_id", // في Cashier
  foreignField: "warehouse_id", // في User
  justOne: false,             // لو عايزهم array
});

// لازم نفعّل الـ virtuals في toJSON / toObject
CashierSchema.set("toJSON", { virtuals: true });
CashierSchema.set("toObject", { virtuals: true });

export const CashierModel = mongoose.model("Cashier", CashierSchema);
