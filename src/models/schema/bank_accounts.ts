import mongoose, { Schema } from "mongoose";

const BankAccountSchema = new Schema(
  {
    account_no: { type: String, required: true, maxlength: 100, unique: true, trim: true },
    name: { type: String, required: true, maxlength: 100, trim: true },
    initial_balance: { type: Number, required: true, min: 0 },
    is_default: { type: Boolean, default: false },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

export const BankAccountModel = mongoose.model("BankAccount", BankAccountSchema);
