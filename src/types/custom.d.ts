// src/types/custom.ts
import { Request } from "express";
import { Types } from "mongoose";
import { ModuleName, ActionName } from "../constants/permissions";

export interface PermissionAction {
  id: string;          // جاي من _id بتاع Subdocument
  action: ActionName;  // "view" | "add" | "edit" | "delete"
}

/** Permission per module */
export interface UserPermission {
  module: ModuleName;
  actions: PermissionAction[];
}

/** شكل اليوزر في Mongo */
export interface AppUser {
  _id?: Types.ObjectId;
  id?: string;

  username: string;
  email: string;
  password_hash: string;
  status: "active" | "inactive";

  role: "superadmin" | "admin";
  role_id?: Types.ObjectId;

  warehouse_id?: Types.ObjectId;
  warehouseId?: Types.ObjectId; // deprecated, use warehouse_id

  company_name?: string;
  phone?: string;
  image_url?: string;
  address?: string;
  vat_number?: string;
  state?: string;
  postal_code?: string;

  permissions?: {
    module: ModuleName;
    actions: { _id: Types.ObjectId; action: ActionName }[];
  }[];
}

/** اللي جوه الـ JWT */
export interface JwtUserPayload {
  id: string;
  name: string;
  role: "superadmin" | "admin";
  role_id?: string;
  permissions: UserPermission[];
  warehouse_id?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtUserPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export { };
