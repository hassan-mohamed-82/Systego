import mongoose, { Schema } from "mongoose";

const PurchaseInvoiceSchema = new Schema(
  {
    purchase_id: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase" },
    installment_id: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseInstallment" },
    financial_id: { type: mongoose.Schema.Types.ObjectId, ref: "BankAccount" },
    amount: { type: Number, required: true },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

export const PurchaseInvoiceModel = mongoose.model("PurchaseInvoice", PurchaseInvoiceSchema);