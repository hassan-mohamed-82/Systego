import { verifyToken } from "../utils/auth";
import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../Errors/unauthorizedError";

export function authenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Invalid Token");
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token); // { id, name, role, positionId, roles, actions }

  req.user = decoded; // 👈 كده نقدر نستخدمه جوّه أى controller
  next();
}
