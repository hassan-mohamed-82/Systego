import mongoose, { Schema } from "mongoose";

const SupplierSchema = new Schema({
  image: { type: String },
  username: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, maxlength: 150 },
  phone_number: { type: String, maxlength: 20, unique: true , required: true},
  address: { type: String },
  company_name: { type: String, maxlength: 150 },
  cityId:{ type: mongoose.Schema.Types.ObjectId, ref: "City" },
  countryId:{ type: mongoose.Schema.Types.ObjectId, ref: "Country" },
  
});

export const SupplierModel = mongoose.model("Supplier", SupplierSchema);