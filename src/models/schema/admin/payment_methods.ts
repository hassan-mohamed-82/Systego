import mongoose from "mongoose";

const paymetnMethodSchema = new mongoose.Schema({

    name:{ type: String, required: true, unique: true },
    ar_name:{ type: String, required: true, unique: true },
    isActive:{ type: Boolean, default: true},
    discription:{ type: String, required: true},
    icon:{ type: String, required: true},
    type:{type: String, required: true,enum:["manual","automatic"]},




}, { timestamps: true });

export const PaymentMethodModel = mongoose.model('PaymentMethod', paymetnMethodSchema);