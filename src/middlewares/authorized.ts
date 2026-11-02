import { NextFunction, Request, Response, RequestHandler } from "express";
import { ForbiddenError } from "../Errors/forbiddenError";
import { UnauthorizedError } from "../Errors/unauthorizedError";

export const authorizeRoles = (...roles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError("Not authenticated");
    }

    // A valid token with the wrong role is an authorization problem (403),
    // not an expired session (401). Returning 401 used to force a logout
    // on the POS client.
    if (!req.user.role || !roles.includes(req.user.role)) {
      throw new ForbiddenError("You are not authorized to access this resource", {
        code: "ROLE_NOT_ALLOWED",
        required_roles: roles,
        current_role: req.user.role || null,
      });
    }

    next();
  };
};
