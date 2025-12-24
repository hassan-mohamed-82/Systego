// src/models/schema/admin/Role.ts

import mongoose, { Schema, Document } from "mongoose";
import { MODULES, ACTION_NAMES, ModuleName, ActionName } from "../../../types/constant";

// Schema للـ Action داخل كل Permission
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

// Schema للـ Permission (module + actions)
const RolePermissionSchema = new Schema(
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

// Interface للـ Role Document
export interface IRole extends Document {
  name: string;
  status: "active" | "inactive";
  permissions: {
    module: ModuleName;
    actions: { _id: mongoose.Types.ObjectId; action: ActionName }[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}

// Schema الرئيسي للـ Role
const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    permissions: {
      type: [RolePermissionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export const RoleModel = mongoose.model<IRole>("Role", RoleSchema);
