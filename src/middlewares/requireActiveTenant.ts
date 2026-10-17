import { Request, Response, NextFunction } from "express";
import { getTenantInfo } from "../utils/tenantService";
import { ForbiddenError } from "../Errors/forbiddenError";

export async function requireActiveTenant(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const tenantInfo = await getTenantInfo();
    const expired =
      tenantInfo.subscription?.expired === true ||
      tenantInfo.tenant?.status === "inactive";

    if (expired) {
      throw new ForbiddenError(
        "Your subscription has expired. Please contact Systego support to renew.",
        { code: "SUBSCRIPTION_EXPIRED" },
      );
    }

    next();
  } catch (error: any) {
    if (error.message?.includes("not configured")) {
      return next();
    }
    next(error);
  }
}
