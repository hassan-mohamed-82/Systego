import { model, Schema, Types } from "mongoose";
import mongoose from "mongoose";
import bcrypt from 'bcryptjs';

const PlatformUserSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "Name is required"],
    },
    email: {
      type: String,
      required: [true, "Email must be provided"],
      unique: [true, "Email must be unique"],
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
      required: [true, "Password is required"],
      minlength: [6, "Too short password"],
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
  },
  { timestamps: true, }
);

PlatformUserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export const Platform_User = mongoose.model('platform_user', PlatformUserSchema);
