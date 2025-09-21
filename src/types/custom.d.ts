import { Request } from "express";
import { Types } from "mongoose";

// ========== Action ==========
export interface Action {
  _id: Types.ObjectId;
  name: "add" | "update" | "delete" | "get"; // الصلاحيات الأساسية
  role: Types.ObjectId; // مرجعية إلى الـ Role
}

// ========== Role ==========
export interface Role {
  _id: Types.ObjectId;
  name: string; // زي "UserManagement" أو "Inventory"
  possitionId: Types.ObjectId; // مرجعية إلى Position
  actions?: Action[];
}

// ========== Position ==========
export interface Position {
  _id: Types.ObjectId;
  name: string;
  roles?: Role[];
}

// ========== User من الـ Database ==========
export interface AppUser {
  password_hash: string;
  _id?: Types.ObjectId;
  id?: string;

  username: string;
  email: string;
  status: "active" | "inactive";

  company_name?: string;
  phone?: string;
  image_url?: string;
  address?: string;
  vat_number?: string;
  state?: string;
  postal_code?: string;

  // العلاقات
  positionId: Position | Types.ObjectId; // ممكن يبقى populate أو ObjectId
  roles?: Role[];                        // populated roles
  actions?: Action[];                    // populated actions
}

// ========== User من الـ JWT ==========
export interface JwtUserPayload {
  id: string;
  name: string;
  positionId: string;
}

// ========== Request مع User ==========
export interface AuthenticatedRequest extends Request {
  user?: JwtUserPayload; // هنا payload صغير مش الـ AppUser كامل
}

// ✅ Type Augmentation لـ Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}
