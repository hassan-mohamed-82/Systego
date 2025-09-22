import mongoose, { Schema } from "mongoose";

const BillerSchema = new Schema({
  image: { type: String },
  name: { type: String, required: true, maxlength: 100 },
  company_name: { type: String, maxlength: 200 },
  vat_number: { type: String, maxlength: 50 },
  email: { type: String, required: true, unique: true, maxlength: 150 },
  phone_number: { type: String, required: true, unique: true, maxlength: 20 },
  address: { type: String, required: true },
  
},{timestamps:true});


export const BillerModel = mongoose.model("Biller", BillerSchema);
