// src/controllers/admin/roleController.ts

import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { RoleModel } from "../../models/schema/admin/roles";
import {  NotFound } from "../../Errors";
import { BadRequest } from "../../Errors/BadRequest";
import { SuccessResponse } from "../../utils/response";
import { MODULES, ACTION_NAMES, ModuleName, ActionName } from "../../types/constant";
type IncomingAction = ActionName | { id?: string; action: ActionName };

interface IncomingPermission {
  module: ModuleName;
  actions: IncomingAction[];
}

// =========================
// Create Role
// =========================
export const createRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, status = "active", permissions = [] } = req.body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new BadRequest("Role name is required");
  }

  const existingRole = await RoleModel.findOne({
    name: { $regex: new RegExp(`^${name.trim()}$`, "i") }
  });

  if (existingRole) {
    throw new BadRequest("Role with this name already exists");
  }

  const cleanedPermissions = normalizePermissions(permissions);

  const role = await RoleModel.create({
    name: name.trim(),
    status,
    permissions: cleanedPermissions,
  });

  // Format response with action IDs
  const formattedPermissions = role.permissions.map((perm) => ({
    module: perm.module,
    actions: perm.actions.map((act) => ({
      id: act._id.toString(),
      action: act.action,
    })),
  }));

  SuccessResponse(res, {
    message: "Role created successfully",
    role: {
      id: role._id,
      name: role.name,
      status: role.status,
      permissions: formattedPermissions,
    },
  });
};

// =========================
// Get All Roles
// =========================
export const getAllRoles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const roles = await RoleModel.find().select("-__v").sort({ createdAt: -1 });

  const formattedRoles = roles.map((role) => ({
    id: role._id,
    name: role.name,
    status: role.status,
    permissionsCount: role.permissions.reduce(
      (acc, p) => acc + p.actions.length,
      0
    ),
    permissions: role.permissions.map((perm) => ({
      module: perm.module,
      actions: perm.actions.map((act) => ({
        id: act._id.toString(),
        action: act.action,
      })),
    })),
    createdAt: role.createdAt,
  }));

  SuccessResponse(res, {
    message: "Roles fetched successfully",
    roles: formattedRoles,
  });
};

// =========================
// Get Role By ID
// =========================
export const getRoleById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid role ID");
  }

  const role = await RoleModel.findById(id).select("-__v");

  if (!role) {
    throw new NotFound("Role not found");
  }

  const formattedPermissions = role.permissions.map((perm) => ({
    module: perm.module,
    actions: perm.actions.map((act) => ({
      id: act._id.toString(),
      action: act.action,
    })),
  }));

  SuccessResponse(res, {
    message: "Role fetched successfully",
    role: {
      id: role._id,
      name: role.name,
      status: role.status,
      permissions: formattedPermissions,
    },
  });
};

// =========================
// Update Role
// =========================
export const updateRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { name, status, permissions } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid role ID");
  }

  const role = await RoleModel.findById(id);

  if (!role) {
    throw new NotFound("Role not found");
  }

  if (name && name.trim() !== role.name) {
    const existingRole = await RoleModel.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existingRole) {
      throw new BadRequest("Role with this name already exists");
    }

    role.name = name.trim();
  }

  if (status !== undefined) {
    role.status = status;
  }

  if (permissions !== undefined) {
    role.permissions = normalizePermissions(permissions) as any;
  }

  await role.save();

  const formattedPermissions = role.permissions.map((perm) => ({
    module: perm.module,
    actions: perm.actions.map((act) => ({
      id: act._id.toString(),
      action: act.action,
    })),
  }));

  SuccessResponse(res, {
    message: "Role updated successfully",
    role: {
      id: role._id,
      name: role.name,
      status: role.status,
      permissions: formattedPermissions,
    },
  });
};

export const getRolePermissions = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid role ID");
  }

  const role = await RoleModel.findById(id).select("name status permissions");

  if (!role) {
    throw new NotFound("Role not found");
  }

  // Full Matrix - كل الموديولات مع enabled/disabled
  const permissions = MODULES.map((mod) => {
    const found = role.permissions.find((p) => p.module === mod);
    return {
      module: mod,
      actions: ACTION_NAMES.map((actionName) => {
        const existingAction = found?.actions.find((a) => a.action === actionName);
        return {
          id: existingAction?._id?.toString() || null,
          action: actionName,
          enabled: !!existingAction,
        };
      }),
    };
  });

  // Active Only - الصلاحيات المفعّلة بس
  const activePermissions = role.permissions.map((perm) => ({
    module: perm.module,
    actions: perm.actions.map((act) => ({
      id: act._id.toString(),
      action: act.action,
    })),
  }));

  SuccessResponse(res, {
    message: "Role permissions fetched successfully",
    role: {
      id: role._id,
      name: role.name,
      status: role.status,
    },
    permissions,           // Full matrix for checkboxes UI
    activePermissions,     // Only enabled permissions
    summary: {
      totalModules: MODULES.length,
      activeModules: activePermissions.length,
      totalActions: activePermissions.reduce((acc, p) => acc + p.actions.length, 0),
    },
  });
};

// =========================
// Update Role Permissions
// =========================
export const updateRolePermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { permissions } = req.body as { permissions: IncomingPermission[] };

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid role ID");
  }

  if (!Array.isArray(permissions)) {
    throw new BadRequest("Permissions must be an array");
  }

  const role = await RoleModel.findById(id);

  if (!role) {
    throw new NotFound("Role not found");
  }

  role.permissions = normalizePermissions(permissions) as any;
  await role.save();

  const formattedPermissions = role.permissions.map((perm) => ({
    module: perm.module,
    actions: perm.actions.map((act) => ({
      id: act._id.toString(),
      action: act.action,
    })),
  }));

  SuccessResponse(res, {
    message: "Role permissions updated successfully",
    permissions: formattedPermissions,
  });
};

// =========================
// Toggle Single Permission Action
// =========================
// export const toggleRolePermissionAction = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { id } = req.params;
//   const { module, action, enabled } = req.body;

//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     throw new BadRequest("Invalid role ID");
//   }

//   if (!module || !MODULES.includes(module)) {
//     throw new BadRequest("Invalid module name");
//   }

//   if (!action || !ACTION_NAMES.includes(action)) {
//     throw new BadRequest("Invalid action name");
//   }

//   if (typeof enabled !== "boolean") {
//     throw new BadRequest("enabled must be a boolean");
//   }

//   const role = await RoleModel.findById(id);

//   if (!role) {
//     throw new NotFound("Role not found");
//   }

//   let modulePermission = role.permissions.find((p) => p.module === module);

//   if (enabled) {
//     if (!modulePermission) {
//       role.permissions.push({
//         module,
//         actions: [{ action }],
//       } as any);
//     } else {
//       const actionExists = modulePermission.actions.find((a) => a.action === action);
//       if (!actionExists) {
//         modulePermission.actions.push({ action } as any);
//       }
//     }
//   } else {
//     if (modulePermission) {
//       modulePermission.actions = modulePermission.actions.filter(
//         (a) => a.action !== action
//       ) as any;

//       if (modulePermission.actions.length === 0) {
//         role.permissions = role.permissions.filter((p) => p.module !== module) as any;
//       }
//     }
//   }

//   await role.save();

//   const formattedPermissions = role.permissions.map((perm) => ({
//     module: perm.module,
//     actions: perm.actions.map((act) => ({
//       id: act._id.toString(),
//       action: act.action,
//     })),
//   }));

//   SuccessResponse(res, {
//     message: `Permission ${enabled ? "enabled" : "disabled"} successfully`,
//     permissions: formattedPermissions,
//   });
// };

// =========================
// Delete Role
// =========================
export const deleteRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid role ID");
  }

  const { UserModel } = await import("../../models/schema/admin/User");
  const usersWithRole = await UserModel.countDocuments({ role_id: id });

  if (usersWithRole > 0) {
    throw new BadRequest(
      `Cannot delete role. ${usersWithRole} user(s) are assigned to this role`
    );
  }

  const role = await RoleModel.findByIdAndDelete(id);

  if (!role) {
    throw new NotFound("Role not found");
  }

  SuccessResponse(res, {
    message: "Role deleted successfully",
  });
};

// =========================
// Delete Permission Action from Role
// =========================
// export const deleteRolePermissionAction = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { roleId, module, actionId } = req.params;

//   if (!mongoose.Types.ObjectId.isValid(roleId)) {
//     throw new BadRequest("Invalid role ID");
//   }

//   if (!mongoose.Types.ObjectId.isValid(actionId)) {
//     throw new BadRequest("Invalid action ID");
//   }

//   if (!MODULES.includes(module as any)) {
//     throw new BadRequest("Invalid module name");
//   }

//   const actionObjectId = new mongoose.Types.ObjectId(actionId);

//   const result = await RoleModel.updateOne(
//     { _id: roleId, "permissions.module": module },
//     {
//       $pull: {
//         "permissions.$.actions": { _id: actionObjectId },
//       },
//     }
//   );

//   if (result.modifiedCount === 0) {
//     throw new NotFound("Permission action not found for this module");
//   }

//   const updatedRole = await RoleModel.findById(roleId).select("permissions");

//   const formattedPermissions = updatedRole?.permissions.map((perm) => ({
//     module: perm.module,
//     actions: perm.actions.map((act) => ({
//       id: act._id.toString(),
//       action: act.action,
//     })),
//   })) || [];

//   SuccessResponse(res, {
//     message: "Permission action removed successfully",
//     permissions: formattedPermissions,
//   });
// };

// // =========================
// // Get Roles for Selection (Dropdown)
// // =========================
export const getRolesForSelection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const roles = await RoleModel.find({ status: "active" }).select("_id name");

  SuccessResponse(res, {
    message: "Roles fetched successfully",
    roles: roles.map((r) => ({
      id: r._id,
      name: r.name,
    })),
  });
};

// // Get User Effective Permissions (Role + Custom merged)
// export const getUserEffectivePermissions = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const { id } = req.params;

//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     throw new BadRequest("Invalid user ID");
//   }

//   const { UserModel } = await import("../../models/schema/admin/User");
//   const user = await UserModel.findById(id)
//     .select("username email role_type role_id permissions")
//     .populate("role_id", "name permissions");

//   if (!user) {
//     throw new NotFound("User not found");
//   }

//   // Superadmin has all permissions
//   if (user.role_type === "superadmin") {
//     const allPermissions = MODULES.map((mod) => ({
//       module: mod,
//       actions: ACTION_NAMES.map((action) => ({
//         action,
//         enabled: true,
//         source: "superadmin",
//       })),
//     }));

//     return SuccessResponse(res, {
//       message: "User has superadmin access",
//       user: {
//         id: user._id,
//         username: user.username,
//         email: user.email,
//         role_type: user.role_type,
//       },
//       permissions: allPermissions,
//     });
//   }

//   // Merge role permissions + custom permissions
//   const rolePermissions = (user.role_id as any)?.permissions || [];
//   const customPermissions = user.permissions || [];

//   const effectivePermissions = MODULES.map((mod) => {
//     const roleModule = rolePermissions.find((p: any) => p.module === mod);
//     const customModule = customPermissions.find((p: any) => p.module === mod);

//     const actions = ACTION_NAMES.map((actionName) => {
//       const inRole = roleModule?.actions?.some((a: any) => a.action === actionName);
//       const inCustom = customModule?.actions?.some((a: any) => a.action === actionName);

//       return {
//         action: actionName,
//         enabled: inRole || inCustom,
//         source: inCustom ? "custom" : inRole ? "role" : null,
//       };
//     });

//     return { module: mod, actions };
//   });

//   SuccessResponse(res, {
//     message: "User effective permissions fetched successfully",
//     user: {
//       id: user._id,
//       username: user.username,
//       email: user.email,
//       role_type: user.role_type,
//       role: user.role_id
//         ? { id: (user.role_id as any)._id, name: (user.role_id as any).name }
//         : null,
//     },
//     permissions: effectivePermissions,
//   });
// };

// =========================
// Helper Functions
// =========================
function normalizePermissions(permissions: IncomingPermission[]) {
  return permissions
    .filter((p) => p.module && MODULES.includes(p.module))
    .map((p) => {
      const normalizedActions = Array.isArray(p.actions)
        ? p.actions
            .map((a): ActionName | null => {
              if (typeof a === "string") return a as ActionName;
              if (a && typeof a.action === "string") return a.action as ActionName;
              return null;
            })
            .filter((a): a is ActionName => !!a && ACTION_NAMES.includes(a))
        : [];

      return {
        module: p.module,
        actions: normalizedActions.map((a) => ({ action: a })),
      };
    })
    .filter((p) => p.actions.length > 0);
}

// =========================
// Get All Modules & Actions (For Frontend Permissions UI)
// =========================
export const getModulesAndActions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const modules = MODULES.map((moduleName, index) => ({
    id: index + 1,
    name: moduleName,
    label: formatModuleName(moduleName),
    actions: ACTION_NAMES.map((actionName, actionIndex) => ({
      id: actionIndex + 1,
      name: actionName,
    })),
  }));

  SuccessResponse(res, {
    message: "Modules and actions fetched successfully",
    modules,
    actions: ACTION_NAMES,
    summary: {
      totalModules: MODULES.length,
      totalActions: ACTION_NAMES.length,
      totalPermissions: MODULES.length * ACTION_NAMES.length,
    },
  });
};

function formatModuleName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

