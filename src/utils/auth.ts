import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UnauthorizedError } from "../Errors";
import { UserModel } from "../models/schema/admin/User";

dotenv.config();

export const generateToken = (user: any): string => {
  return jwt.sign(
    {
      id: user._id?.toString(),
      name: user.username,
      role: user.role,
      positionId: user.positionId?.toString(),
      roles: Array.isArray(user.roles) ? user.roles.map((role: any) => role.name) : [],
      actions: Array.isArray(user.actions) ? user.actions.map((action: any) => action.name) : [],
      tokenVersion: user.tokenVersion ?? 0,   // 👈 مهم
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
};

export const verifyToken = async (token: string) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as jwt.JwtPayload & { tokenVersion?: number };

    // هات اليوزر من الـ DB
    const user = await UserModel.findById(decoded.id).select(
      "username role positionId tokenVersion"
    );
    if (!user) {
      throw new UnauthorizedError("Invalid token");
    }

    const tokenVersionInToken = decoded.tokenVersion ?? 0;

    // لو الـ version اللي في التوكن غير اللي في الـ DB يبقى التوكن خلاص باظ
    if (user.tokenVersion !== tokenVersionInToken) {
      throw new UnauthorizedError("Token expired, please login again");
    }

    return {
      id: user._id.toString(),
      name: decoded.name as string,
      role: decoded.role as string,
      positionId: decoded.positionId as string,
      roles: decoded.roles ?? [],
      actions: decoded.actions ?? [],
    };
  } catch (error) {
    throw new UnauthorizedError("Invalid token");
  }
};
