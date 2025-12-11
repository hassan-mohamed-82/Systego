import { Request } from "express";
import { Types } from "mongoose";

export interface Action {
  _id: Types.ObjectId;
  name: "add" | "update" | "delete" | "get";
  role: Types.ObjectId; // أو roleId لو عندك في الاسكيمـا
}

export interface Role {
  _id: Types.ObjectId;
  name: string;

  // الاسم الصح من الداتابيز
  positionId?: Types.ObjectId;

  // الاسم الغلط القديم (خليه اختياري عشان ما يكسرش حاجة)
  possitionId?: Types.ObjectId;

  actions?: Action[];
}

export interface Position {
  _id: Types.ObjectId;
  name: string;
  roles?: Role[];
}

export interface AppUser {
  password_hash: string;
  _id?: Types.ObjectId;
  id?: string;

  username: string;
  email: string;
  status: "active" | "inactive";

  role: "superadmin" | "admin";

  // 👇 فرع / مخزن اليوزر
  warehouse_id?: Types.ObjectId;

  company_name?: string;
  phone?: string;
  image_url?: string;
  address?: string;
  vat_number?: string;
  state?: string;
  postal_code?: string;

  positionId: Position | Types.ObjectId;
  roles?: Role[];
  actions?: Action[];
}

export interface JwtUserPayload {
  id: string;
  name: string;
  role: string;
  positionId: string;
  roles: string[];
  actions: string[];

  // 👇 هنستخدمه في getCashiers
  warehouse_id?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtUserPayload;
}

// augment للـ Express.Request عشان تقدر تقول req.user في أي مكان
declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export {};