import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../Errors/unauthorizedError";

const WAREHOUSE_KEYS = ["warehouse_id", "warehouseId", "WarehouseId", "fromWarehouseId", "toWarehouseId"];

function normalizeId(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const str = String(value).trim();
  return str.length ? str : null;
}

function collectWarehouseIds(input: unknown, output: string[], depth = 0): void {
  if (!input || depth > 5) {
    return;
  }

  if (Array.isArray(input)) {
    input.forEach((item) => collectWarehouseIds(item, output, depth + 1));
    return;
  }

  if (typeof input !== "object") {
    return;
  }

  const record = input as Record<string, unknown>;

  Object.keys(record).forEach((key) => {
    const value = record[key];

    if (WAREHOUSE_KEYS.includes(key)) {
      const normalized = normalizeId(value);
      if (normalized) {
        output.push(normalized);
      }
    }

    if (value && typeof value === "object") {
      collectWarehouseIds(value, output, depth + 1);
    }
  });
}

export function enforceWarehouseScope(req: Request, res: Response, next: NextFunction) {
  const user = req.user;

  if (!user) {
    throw new UnauthorizedError("Not authenticated");
  }

  if (user.role === "superadmin") {
    return next();
  }

  const scopedWarehouseId = normalizeId(user.warehouse_id);
  if (!scopedWarehouseId) {
    return next();
  }

  // =========================================================
  // Transfers are cross-warehouse by nature:
  // - A scoped user can only SEND from their own warehouse.
  // - A scoped user can only RECEIVE into their own warehouse.
  // - Other warehouse IDs in the payload (destination on create,
  //   source on receive) are allowed.
  // =========================================================
  const isTransferRoute =
    req.path === "/transfer" ||
    req.path.startsWith("/transfer/") ||
    /^\/api\/admin\/transfer(?:\/|$|\?)/.test(req.originalUrl || "");

  if (isTransferRoute) {
    if (req.method === "POST") {
      const fromWarehouseId = normalizeId(
        (req.body as Record<string, unknown> | undefined)?.fromWarehouseId,
      );

      if (fromWarehouseId !== scopedWarehouseId) {
        throw new UnauthorizedError(
          "You can only create transfers from your assigned warehouse",
        );
      }

      return next();
    }

    if (["PUT", "PATCH"].includes(req.method)) {
      const targetWarehouseId = normalizeId(
        (req.body as Record<string, unknown> | undefined)?.warehouseId,
      );

      if (targetWarehouseId !== scopedWarehouseId) {
        throw new UnauthorizedError(
          "You can only update transfers for your assigned warehouse",
        );
      }

      return next();
    }

    // GET / DELETE: any warehouse id in params/query must match the scope
    const transferIds: string[] = [];
    collectWarehouseIds(req.params, transferIds);
    collectWarehouseIds(req.query, transferIds);

    if (transferIds.some((warehouseId) => warehouseId !== scopedWarehouseId)) {
      throw new UnauthorizedError(
        "You are not allowed to access another warehouse",
      );
    }

    return next();
  }

  const foundIds: string[] = [];
  collectWarehouseIds(req.params, foundIds);
  collectWarehouseIds(req.query, foundIds);
  collectWarehouseIds(req.body, foundIds);

  const hasViolation = foundIds.some((warehouseId) => warehouseId !== scopedWarehouseId);
  if (hasViolation) {
    throw new UnauthorizedError("You are not allowed to access another warehouse");
  }

  if (["GET", "DELETE"].includes(req.method)) {
    if (!("warehouse_id" in req.query) && !("warehouseId" in req.query)) {
      (req.query as Record<string, unknown>).warehouse_id = scopedWarehouseId;
    }
    return next();
  }

  if (["POST", "PUT", "PATCH"].includes(req.method) && req.body && typeof req.body === "object") {
    const body = req.body as Record<string, unknown>;
    if (!("warehouse_id" in body) && !("warehouseId" in body)) {
      body.warehouse_id = scopedWarehouseId;
    }
  }
  
  return next();
}
