"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceWarehouseScope = enforceWarehouseScope;
const unauthorizedError_1 = require("../Errors/unauthorizedError");
const WAREHOUSE_KEYS = ["warehouse_id", "warehouseId", "WarehouseId", "fromWarehouseId", "toWarehouseId"];
function normalizeId(value) {
    if (value === undefined || value === null) {
        return null;
    }
    const str = String(value).trim();
    return str.length ? str : null;
}
function collectWarehouseIds(input, output, depth = 0) {
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
    const record = input;
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
function enforceWarehouseScope(req, res, next) {
    const user = req.user;
    if (!user) {
        throw new unauthorizedError_1.UnauthorizedError("Not authenticated");
    }
    if (user.role === "superadmin") {
        return next();
    }
    const scopedWarehouseId = normalizeId(user.warehouse_id);
    if (!scopedWarehouseId) {
        return next();
    }
    const foundIds = [];
    collectWarehouseIds(req.params, foundIds);
    collectWarehouseIds(req.query, foundIds);
    collectWarehouseIds(req.body, foundIds);
    const hasViolation = foundIds.some((warehouseId) => warehouseId !== scopedWarehouseId);
    if (hasViolation) {
        throw new unauthorizedError_1.UnauthorizedError("You are not allowed to access another warehouse");
    }
    if (["GET", "DELETE"].includes(req.method)) {
        if (!("warehouse_id" in req.query) && !("warehouseId" in req.query)) {
            req.query.warehouse_id = scopedWarehouseId;
        }
        return next();
    }
    if (["POST", "PUT", "PATCH"].includes(req.method) && req.body && typeof req.body === "object") {
        const body = req.body;
        if (!("warehouse_id" in body) && !("warehouseId" in body)) {
            body.warehouse_id = scopedWarehouseId;
        }
    }
    return next();
}
