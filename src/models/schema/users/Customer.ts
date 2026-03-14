import { Schema } from "mongoose";
import mongoose from "mongoose";
import bcrypt from 'bcryptjs';

const CustomerSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "Name is required"],
    },
    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      unique: [true, "Email must be unique"],
      sparse: true,
      trim: true,
      lowercase: true,
    },
    phone_number: {
      type: String,
      required: [true, "Phone number is required"],
      unique: [true, "Phone number must be unique"],
      trim: true,
      minlength: [10, "Too short phone number"],
      maxlength: [15, "Too long phone number"],
    },
    password: {
      type: String,
      minlength: [6, "Too short password"],
    },
    is_profile_complete: {
      type: Boolean,
      default: false,
    },
    otp_code: {
      type: String,
      default: null,
    },
    otp_expires_at: {
      type: Date,
      default: null,
    },
    imagePath: {
      type: String,
      default: null,
    },
    wishlist: [
      {
        type: Schema.Types.ObjectId,
        ref: "Products",
      },
    ],
    addresses: [
      {
        type: Schema.Types.ObjectId,
        ref: "Address",
      },
    ],
  },
  { timestamps: true, }
);

CustomerSchema.pre("save", async function (next) {
  this.is_profile_complete = Boolean(this.username?.trim() && this.password);

  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export const CustomerModel = mongoose.model('UserStore', CustomerSchema);
