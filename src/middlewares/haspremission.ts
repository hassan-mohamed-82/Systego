// src/middlewares/authorizePermissions.ts
import { NextFunction, Response, RequestHandler } from "express";
import { AuthenticatedRequest } from "../types/custom";
import { ModuleName, ActionName } from "../types/constant";
import { UnauthorizedError } from "../Errors/unauthorizedError";
export const authorizePermissions = (
  moduleName: ModuleName,
  actionName: ActionName
): RequestHandler => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedError("Unauthorized");
    }

    if (user.role === "superadmin") {
      return next();
    }

    if (user.role !== "admin") {
      throw new UnauthorizedError("You are not authorized to access this resource");
    }

    const perm = user.permissions?.find((p) => p.module === moduleName);
    if (!perm) {
      throw new UnauthorizedError(`No access to module: ${moduleName}`);
    }

    const hasAction = perm.actions?.some((a) => a.action === actionName);
    if (!hasAction) {
      throw new UnauthorizedError(`No permission: ${actionName} on ${moduleName}`);
    }

    return next();
  };
};