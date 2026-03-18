import mongoose, { Schema } from "mongoose";
import bcrypt from 'bcryptjs';

const CustomerSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: [true, "Email must be unique"], sparse: true, trim: true, lowercase: true, },
    phone_number: { type: String, required: true, unique: [true, "Phone number must be unique"], trim: true, minlength: [10, "Too short phone number"], maxlength: [15, "Too long phone number"], },
    address: { type: String },
    country: { type: Schema.Types.ObjectId, ref: 'Country' },
    city: { type: Schema.Types.ObjectId, ref: 'City' },
    customer_group_id: { type: Schema.Types.ObjectId, ref: 'CustomerGroup' },
    total_points_earned: { type: Number, default: 0, min: 0 },
    is_Due: { type: Boolean, default: false },
    amount_Due: { type: Number, default: 0 },

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
        ref: "Product",
      },
    ],
    addresses: [
      {
        type: Schema.Types.ObjectId,
        ref: "Address",
      },
    ],
  },
  { timestamps: true }
);

const CustomerGroupSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    status: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CustomerSchema.pre("save", async function (next) {
  this.is_profile_complete = Boolean(this.name?.trim() && this.password);

  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});


export const CustomerModel = mongoose.model("Customer", CustomerSchema);
export const CustomerGroupModel = mongoose.model("CustomerGroup", CustomerGroupSchema);

