import mongoose, { Schema } from "mongoose";

const SupplierSchema = new Schema({
  image: { type: String },
  username: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, maxlength: 150 },
  phone_number: { type: String, maxlength: 20, unique: true , required: true},
  vat_number: { type: String, maxlength: 50 },
  address: { type: String },
  state: { type: String, maxlength: 100 },
  postal_code: { type: String, maxlength: 20 },
  total_due: { type: Schema.Types.Decimal128, default: 0.0 },
  created_at: { type: Date, default: Date.now },
});

export const SupplierModel = mongoose.model("Supplier", SupplierSchema);