import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UnauthorizedError } from "../Errors";

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
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );
};



export const verifyToken = (token: string) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as jwt.JwtPayload;

    return {
      id: decoded.id as string,
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
