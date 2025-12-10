import { verifyToken } from "../utils/auth";
import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../Errors/unauthorizedError";

export async function authenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Invalid Token");
  }

  const token = authHeader.split(" ")[1];

  const decoded = await verifyToken(token); // 👈 بقى async
  req.user = decoded;                       // { id, name, role, positionId, roles, actions }

  next();
}
