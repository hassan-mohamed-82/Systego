import { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../Errors/forbiddenError";
import { UnauthorizedError } from "../Errors/unauthorizedError";
import { ModuleName, ActionName } from "../types/constant";

/**
 * Permission failures are an AUTHORIZATION problem, not an authentication one:
 * the user is logged in and the token is valid, he just lacks a permission.
 * Returning 401 here made the POS client treat it as "session expired" and
 * force a logout. 403 + structured details let the client tell the user
 * exactly which module/action is missing.
 */
const permissionDetails = (
  module: string,
  requiredActions: string[],
  grantedActions: string[] = [],
) => ({
  code: "PERMISSION_DENIED",
  module,
  required_actions: requiredActions,
  granted_actions: grantedActions,
});

export const authorizePermissions = (
  module: ModuleName,
  action: ActionName | ActionName[]
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const allowedActions = Array.isArray(action) ? action : [action];

    if (!user) {
      // No authenticated user at all -> real authentication failure
      throw new UnauthorizedError("Not authenticated");
    }

    // Superadmin bypasses all checks
    if (user.role === "superadmin") {
      return next();
    }

    const modulePermission = user.permissions?.find((p) => p.module === module);

    if (!modulePermission) {
      throw new ForbiddenError(
        `No access to ${module} module`,
        permissionDetails(module, allowedActions, []),
      );
    }

    const grantedActions = modulePermission.actions.map((a) => a.action);
    const hasAction = modulePermission.actions.some((a) =>
      allowedActions.includes(a.action as ActionName)
    );

    if (!hasAction) {
      throw new ForbiddenError(
        `No permission to ${allowedActions.join(" or ")} in ${module}`,
        permissionDetails(module, allowedActions, grantedActions),
      );
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
    const allowedActions = Array.isArray(action) ? action : [action];

    if (!user) {
      throw new UnauthorizedError("Not authenticated");
    }

    if (user.role === "superadmin") {
      return next();
    }

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
      const grantedActions: Record<string, string[]> = {};
      modules.forEach((module) => {
        const permission = user.permissions?.find((p) => p.module === module);
        grantedActions[module] = permission
          ? permission.actions.map((a) => a.action)
          : [];
      });

      throw new ForbiddenError(
        `No permission to ${allowedActions.join(" or ")} in ${modules.join(
          " / "
        )}`,
        {
          code: "PERMISSION_DENIED",
          modules,
          required_actions: allowedActions,
          granted_actions: grantedActions,
        },
      );
    }

    next();
  };
};
