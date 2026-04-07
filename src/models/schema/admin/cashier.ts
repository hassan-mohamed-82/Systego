import mongoose, { Types, Document } from "mongoose";

export interface CashierDoc extends Document {
  name: string;
  ar_name: string;
  warehouse_id: Types.ObjectId;
  status: boolean;
  cashier_active: boolean;
  bankAccounts: Types.ObjectId[];
  printer_type?: "USB" | "NETWORK";
  printer_IP?: string;
  printer_port?: number;
  Printer_name?: string;
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
    
    printer_type: { type: String, enum: ["USB", "NETWORK"] },
    
    // إجبار إدخال البيانات لو النوع NETWORK
    printer_IP: { 
      type: String, 
      required: function(this: any) { return this.printer_type === "NETWORK"; } 
    },
    printer_port: { 
      type: Number, 
      required: function(this: any) { return this.printer_type === "NETWORK"; } 
    },
    Printer_name: { 
      type: String, 
      required: function(this: any) { return this.printer_type === "NETWORK"; } 
    },
  },
  { timestamps: true }
);

// ✅ Virtual للـ users
CashierSchema.virtual("warehouseUsers", {
  ref: "User",
  localField: "warehouse_id",
  foreignField: "warehouseId",
  justOne: false,
});

CashierSchema.set("toJSON", { virtuals: true });
CashierSchema.set("toObject", { virtuals: true });

export const CashierModel = mongoose.model<CashierDoc>("Cashier", CashierSchema);