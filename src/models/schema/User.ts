import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },

    company_name: { type: String },
    phone: { type: String },

    role: { type: String, required: true, enum: ["Admin", "Cashier", "Storesman"] },
    status: { type: String, default: "active", enum: ["active", "inactive"] },

    image_url: { type: String },
    address: { type: String },
    vat_number: { type: String },
    state: { type: String },
    postal_code: { type: String },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model("User", UserSchema);
