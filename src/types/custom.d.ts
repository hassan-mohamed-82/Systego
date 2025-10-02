import { Request } from "express";
import { Types } from "mongoose";

export interface Action {
  _id: Types.ObjectId;
  name: "add" | "update" | "delete" | "get"; 
  role: Types.ObjectId; 
}

export interface Role {
  _id: Types.ObjectId;
  name: string; 
  possitionId: Types.ObjectId; 
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
  role:string;  
  positionId: string;
  roles: string[];
  actions: string[];

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
