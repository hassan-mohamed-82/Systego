import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UnauthorizedError } from "../Errors";

dotenv.config();

export const generateToken = (user: any): string => {
  return jwt.sign(
    {
      id: user._id?.toString(),
      name: user.username,
      positionId: user.positionId?.toString(), // بدل role
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
      positionId: decoded.positionId as string,
    };
  } catch (error) {
    throw new UnauthorizedError("Invalid token");
  }
};
