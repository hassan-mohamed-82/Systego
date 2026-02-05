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
import { authorizePermissions } from '../../middlewares/haspremission';

const router = Router();

// Apply authentication to all routes

// Selection (for dropdown)
router.get("/selection", catchAsync(getRolesForSelection));
router.get("/modules-actions", catchAsync(getModulesAndActions));
// CRUD
router.post("/",authorizePermissions("permission","Add"), catchAsync(createRole));
router.get("/",authorizePermissions("permission","View"), catchAsync(getAllRoles));
router.get("/:id",authorizePermissions("permission","View"), catchAsync(getRoleById));
router.get("/:id/permissions",authorizePermissions("permission","View"), catchAsync(getRolePermissions));
router.put("/:id",authorizePermissions("permission","Edit"), catchAsync(updateRole));
router.delete("/:id",authorizePermissions("permission","Delete"), catchAsync(deleteRole));

// Permissions
// router.get("/:id/permissions", catchAsync(getRolePermissions));
// router.put("/:id/permissions", catchAsync(updateRolePermissions));
// router.post("/:id/permissions/toggle", catchAsync(toggleRolePermissionAction));
// router.delete("/:roleId/permissions/:module/:actionId", catchAsync(deleteRolePermissionAction));

export default router;