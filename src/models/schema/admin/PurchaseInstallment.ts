import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPurchaseInstallment extends Document {
    purchase_id: Types.ObjectId;
    amount: number;
    date: Date;
    status: "pending" | "paid";
    createdAt: Date;
    updatedAt: Date;
}

const PurchaseInstallmentSchema = new Schema<IPurchaseInstallment>(
    {
        purchase_id: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase", required: true },
        amount: { type: Number, required: true },
        date: { type: Date, required: true },
        status: { type: String, enum: ["pending", "paid"], default: "pending" },
    },
    { timestamps: true }
);

export const PurchaseInstallmentModel = mongoose.model<IPurchaseInstallment>("PurchaseInstallment", PurchaseInstallmentSchema);
