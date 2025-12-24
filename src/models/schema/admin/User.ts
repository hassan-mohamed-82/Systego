// src/models/schema/admin/User.ts

import mongoose, { Schema, Document } from "mongoose";
import { MODULES, ACTION_NAMES, ModuleName, ActionName } from "../../../types/constant";

const PermissionActionSchema = new Schema(
  {
    action: {
      type: String,
      enum: ACTION_NAMES,
      required: true,
    },
  },
  { _id: true }
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

export interface IUser extends Document {
  username: string;
  email: string;
  password_hash: string;
  company_name?: string;
  phone?: string;
  role_id?: mongoose.Types.ObjectId;
  permissions: {
    module: ModuleName;
    actions: { _id: mongoose.Types.ObjectId; action: ActionName }[];
  }[];
  status: "active" | "inactive";
  image_url?: string;
  address?: string;
  role: "superadmin" | "admin";
  vat_number?: string;
  state?: string;
  postal_code?: string;
  warehouse_id?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: { 
      type: String, 
      required: true 
    },
    company_name: { 
      type: String 
    },
    phone: { 
      type: String 
    },

    // Reference للـ Role (Select من Dropdown)
    role_id: { 
      type: Schema.Types.ObjectId, 
      ref: "Role"
    },
    role: {
      type: String,
      enum: ["superadmin", "admin"],
      default: "admin",
    },
    

    // صلاحيات إضافية خاصة باليوزر (override)
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
    warehouse_id: { 
      type: Schema.Types.ObjectId, 
      ref: "Warehouse" 
    },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>("User", UserSchema);
