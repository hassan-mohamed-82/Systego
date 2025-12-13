// src/utils/jwt.ts  (أو نفس مكان الملف القديم)
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UnauthorizedError } from "../Errors";
import { JwtUserPayload, UserPermission } from "../types/custom";

dotenv.config();

interface TokenUserInput {
  _id: string | import("mongoose").Types.ObjectId;
  username: string;
  role: "superadmin" | "admin";
  warehouseId?: string | import("mongoose").Types.ObjectId;
  permissions?: UserPermission[];
}

export const generateToken = (user: TokenUserInput): string => {
  const payload: JwtUserPayload = {
    id: user._id.toString(),
    name: user.username,
    role: user.role,
    warehouse_id: user.warehouseId ? user.warehouseId.toString() : undefined,
    permissions: user.permissions || [],
  };

  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });
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
      warehouse_id: decoded.warehouse_id as string | undefined,
      permissions: (decoded.permissions || []) as UserPermission[],
    };
  } catch {
    throw new UnauthorizedError("Invalid token");
  }
};
