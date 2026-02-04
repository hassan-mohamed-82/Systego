import { Router } from 'express';
import {
  getAllRoles,
  getRoleById,
  getRolePermissions,
  getRolesForSelection,
  createRole,
  getModulesAndActions,
  updateRole,
  //updateRolePermissions,
  //toggleRolePermissionAction,
  deleteRole,
 // deleteRolePermissionAction
} from '../../controller/admin/permission';
import { catchAsync } from '../../utils/catchAsync';
import { authenticated } from '../../middlewares/authenticated';

const router = Router();

// Apply authentication to all routes

// Selection (for dropdown)
router.get("/selection", catchAsync(getRolesForSelection));
router.get("/modules-actions", catchAsync(getModulesAndActions));
// CRUD
router.post("/", catchAsync(createRole));
router.get("/", catchAsync(getAllRoles));
router.get("/:id", catchAsync(getRoleById));
router.get("/:id/permissions", catchAsync(getRolePermissions));
router.put("/:id", catchAsync(updateRole));
router.delete("/:id", catchAsync(deleteRole));

// Permissions
// router.get("/:id/permissions", catchAsync(getRolePermissions));
// router.put("/:id/permissions", catchAsync(updateRolePermissions));
// router.post("/:id/permissions/toggle", catchAsync(toggleRolePermissionAction));
// router.delete("/:roleId/permissions/:module/:actionId", catchAsync(deleteRolePermissionAction));

export default router;