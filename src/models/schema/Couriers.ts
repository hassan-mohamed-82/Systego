import mongoose, { Schema } from "mongoose";

const CourierSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    phone_number: { type: String, required: true, maxlength: 20, unique: true },
    address: { type: String, required: true },
  },
  { timestamps: true } 
);

export const CourierModel = mongoose.model("Courier", CourierSchema);
