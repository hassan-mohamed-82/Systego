"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const permission_1 = require("../../controller/admin/permission");
const catchAsync_1 = require("../../utils/catchAsync");
const haspremission_1 = require("../../middlewares/haspremission");
const router = (0, express_1.Router)();
// Apply authentication to all routes
// Selection (for dropdown)
router.get("/selection", (0, catchAsync_1.catchAsync)(permission_1.getRolesForSelection));
router.get("/modules-actions", (0, catchAsync_1.catchAsync)(permission_1.getModulesAndActions));
// CRUD
router.post("/", (0, haspremission_1.authorizePermissions)("permission", "Add"), (0, catchAsync_1.catchAsync)(permission_1.createRole));
router.get("/", (0, haspremission_1.authorizePermissions)("permission", "View"), (0, catchAsync_1.catchAsync)(permission_1.getAllRoles));
router.get("/:id", (0, haspremission_1.authorizePermissions)("permission", "View"), (0, catchAsync_1.catchAsync)(permission_1.getRoleById));
router.get("/:id/permissions", (0, haspremission_1.authorizePermissions)("permission", "View"), (0, catchAsync_1.catchAsync)(permission_1.getRolePermissions));
router.put("/:id", (0, haspremission_1.authorizePermissions)("permission", "Edit"), (0, catchAsync_1.catchAsync)(permission_1.updateRole));
router.delete("/:id", (0, haspremission_1.authorizePermissions)("permission", "Delete"), (0, catchAsync_1.catchAsync)(permission_1.deleteRole));
// Permissions
// router.get("/:id/permissions", catchAsync(getRolePermissions));
// router.put("/:id/permissions", catchAsync(updateRolePermissions));
// router.post("/:id/permissions/toggle", catchAsync(toggleRolePermissionAction));
// router.delete("/:roleId/permissions/:module/:actionId", catchAsync(deleteRolePermissionAction));
exports.default = router;
