import mongoose, { Schema, Types } from "mongoose";

const adminSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    hashedPassword: { type: String, required: true },
    imagePath: { type: String },



  },
  { timestamps: true }
);

export const AdminModel = mongoose.model("Admin", adminSchema);

