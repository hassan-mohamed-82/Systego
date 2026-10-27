import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../Errors/unauthorizedError";
import { ModuleName, ActionName } from "../types/constant";

export const authorizePermissions = (
  module: ModuleName,
  action: ActionName | ActionName[]
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedError("Not authenticated");
    }

    // Superadmin bypasses all checks
    if (user.role === "superadmin") {
      return next();
    }

    const modulePermission = user.permissions?.find((p) => p.module === module);

    if (!modulePermission) {
      throw new UnauthorizedError(`No access to ${module} module`);
    }

    const allowedActions = Array.isArray(action) ? action : [action];
    const hasAction = modulePermission.actions.some((a) => allowedActions.includes(a.action as ActionName));

    if (!hasAction) {
      throw new UnauthorizedError(`No permission to ${allowedActions.join(" or ")} in ${module}`);
    }

    next();
  };
};

/**
 * نفس authorizePermissions لكن بيسمح بأكتر من Module
 * (مفيدة للتوافق القديم: التقسيط كان مربوط بـ POS / Admin)
 */
export const authorizeAnyPermission = (
  modules: ModuleName[],
  action: ActionName | ActionName[]
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedError("Not authenticated");
    }

    if (user.role === "superadmin") {
      return next();
    }

    const allowedActions = Array.isArray(action) ? action : [action];

    const allowed = modules.some((module) => {
      const permission = user.permissions?.find((p) => p.module === module);
      return (
        permission &&
        permission.actions.some((a) =>
          allowedActions.includes(a.action as ActionName)
        )
      );
    });

    if (!allowed) {
      throw new UnauthorizedError(
        `No permission to ${allowedActions.join(" or ")} in ${modules.join(
          " / "
        )}`
      );
    }

    next();
  };
};
