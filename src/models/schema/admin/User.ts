// src/models/schema/admin/User.ts
import mongoose, { Schema } from "mongoose";
import { MODULES, ACTION_NAMES } from "../../../types/constant";

// كل أكشن هيبقى Subdocument بـ _id + action
const PermissionActionSchema = new Schema(
  {
    action: {
      type: String,
      enum: ACTION_NAMES,     // ["view","add","edit","delete"]
      required: true,
    },
  },
  { _id: true }          // هنا بيولد _id لكل أكشن
);

const PermissionSchema = new Schema(
  {
    module: {
      type: String,
      enum: MODULES,
      required: true,
    },
    actions: {
      type: [PermissionActionSchema],
      default: [],
    },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: { type: String, required: true },

    company_name: { type: String },
    phone: { type: String },

    role: {
      type: String,
      enum: ["superadmin", "admin"],
      default: "admin",
    },

    permissions: {
      type: [PermissionSchema],
      default: [],
    },

    status: {
      type: String,
      default: "active",
      enum: ["active", "inactive"],
    },

    image_url: { type: String },
    address: { type: String },
    vat_number: { type: String },
    state: { type: String },
    postal_code: { type: String },

warehouse_id: { type: Schema.Types.ObjectId, ref: "Warehouse" },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model("User", UserSchema);
