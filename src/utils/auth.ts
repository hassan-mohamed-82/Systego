import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { UnauthorizedError } from "../Errors";
import { JwtUserPayload, UserPermission } from "../types/custom";

dotenv.config();

export const generateToken = (payload: {
  _id: mongoose.Types.ObjectId;
  username: string;
  role: string;
  role_id: mongoose.Types.ObjectId | null;
  warehouse_id: mongoose.Types.ObjectId | null;
  permissions: UserPermission[];
}) => {
  return jwt.sign(
    {
      id: payload._id.toString(),
      name: payload.username,
      role: payload.role,
      role_id: payload.role_id ? payload.role_id.toString() : null,
      permissions: payload.permissions,
      warehouse_id: payload.warehouse_id
        ? payload.warehouse_id.toString()
        : null,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
};

export const verifyToken = (token: string): JwtUserPayload => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as jwt.JwtPayload;

    return {
      id: decoded.id as string,
      name: decoded.name as string,
      role: decoded.role as "superadmin" | "admin",
      role_id: decoded.role_id as string | undefined,
      warehouse_id: decoded.warehouse_id as string | undefined,
      permissions: (decoded.permissions || []) as UserPermission[],
    };
  } catch {
    throw new UnauthorizedError("Invalid token");
  }
};
