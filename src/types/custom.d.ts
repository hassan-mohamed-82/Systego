import { Request } from "express";
import { Types } from "mongoose";

export interface AppUser {
  _id?: Types.ObjectId; // ObjectId من MongoDB
  id?: string;          // نسخة string من الـ _id

  username?: string;    // موجود في الـ schema
  email?: string;       // موجود في الـ schema
  role?: "Admin" | "Cashier" | "Storesman"; // نفس enum في الـ schema
  status?: "active" | "inactive";           // نفس enum في الـ schema

  company_name?: string;
  phone?: string;
  image_url?: string;
  address?: string;
  vat_number?: string;
  state?: string;
  postal_code?: string;

  // صلاحيات إضافية
  
}

// Extend Express Request with your custom user type
export interface AuthenticatedRequest extends Request {
  user?: AppUser; // بيانات المستخدم بعد التوثيق
}

declare global {
  namespace Express {
    interface Request {
      user?: AppUser;
    }
  }
}
