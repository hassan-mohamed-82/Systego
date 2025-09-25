import mongoose from "mongoose";

const paymetnMethodSchema = new mongoose.Schema({

    name:{ type: String, required: true, unique: true },
    isActive:{ type: Boolean, default: true},
    discription:{ type: String, required: true},
    icon:{ type: String, required: true},




}, { timestamps: true });

export const PaymentMethodModel = mongoose.model('PaymentMethod', paymetnMethodSchema);