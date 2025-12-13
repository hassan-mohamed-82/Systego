import { UnauthorizedError } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { NextFunction, Request, Response } from "express";
import { PositionModel } from "../../models/schema/admin/position";
import { RoleModel } from "../../models/schema/admin/roles";
import { ActionModel } from "../../models/schema/admin/Action";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import mongoose from "mongoose";
import { ACTION_NAMES, ActionName, ModuleName, MODULES } from "../../types/constant";
import { UserModel } from "../../models/schema/admin/User";
type IncomingAction =
  | ActionName                           // "View"
  | { id?: string; action: ActionName }; // {id, action}

interface IncomingPermission {
  module: ModuleName;
  actions: IncomingAction[];
}

/** PUT /admin/users/:id/permissions */
export const updateUserPermissions = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { permissions } = req.body as { permissions: IncomingPermission[] };

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid user id");
  }

  if (!Array.isArray(permissions)) {
    throw new BadRequest("permissions must be an array");
  }

  const user = await UserModel.findById(id);
  if (!user) throw new NotFound("User not found");

  // نعمل normalize للموديولات والأكشنز
  const cleaned = permissions
    .filter((p) => p.module && MODULES.includes(p.module))
    .map((p) => {
      const normalizedActions = Array.isArray(p.actions)
        ? p.actions
            .map((a): ActionName | null => {
              // ممكن يجي string أو object
              if (typeof a === "string") return a as ActionName;
              if (a && typeof a.action === "string") return a.action as ActionName;
              return null;
            })
            .filter((a): a is ActionName => !!a && ACTION_NAMES.includes(a))
        : [];

      // اللي هيتخزن في Mongo: [{ action: "View" }, ...]
      return {
        module: p.module as ModuleName,
        actions: normalizedActions.map((a) => ({ action: a })),
      };
    });

  user.permissions = cleaned as any;
  await user.save();

  SuccessResponse(res, {
    message: "Permissions updated successfully",
    permissions: user.permissions,
  });
};


/** GET /admin/users/:id/permissions */
export const getUserPermissions = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequest("Invalid user id");
  }

  const user = await UserModel.findById(id).select("permissions username email");
  if (!user) throw new NotFound("User not found");

  const userPerms = user.permissions || [];

  const permissions = MODULES.map((mod) => {
    const found = userPerms.find((p: any) => p.module === mod);
    return {
      module: mod,
      actions: (found?.actions || []).map((a: any) => ({
        id: a._id.toString(),
        action: a.action as ActionName,
      })),
    };
  });

  SuccessResponse(res, {
    message: "Permissions fetched successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
    permissions,
  });
};


export const deleteUserPermissionAction = async (req: Request, res: Response) => {
  const { userId, module, actionId } = req.params;

  // 1) تحقق من الـ IDs
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new BadRequest("Invalid user id");
  }
  if (!mongoose.Types.ObjectId.isValid(actionId)) {
    throw new BadRequest("Invalid action id");
  }

  // 2) تأكد إن الموديول صحيح
  if (!MODULES.includes(module as any)) {
    throw new BadRequest("Invalid module name");
  }

  // 3) تأكد إن اليوزر موجود
  const user = await UserModel.findById(userId);
  if (!user) throw new NotFound("User not found");

  const actionObjectId = new mongoose.Types.ObjectId(actionId);

  // 4) احذف الـ action من الموديول المطلوب
  const result = await UserModel.updateOne(
    { _id: userId, "permissions.module": module },
    {
      $pull: {
        "permissions.$.actions": { _id: actionObjectId },
      },
    }
  );

  // لو مفيش ولا دوكيومنت اتعدل → احتمال الـ actionId مش موجود
  if (result.modifiedCount === 0) {
    throw new NotFound("Permission action not found for this module");
  }

  // 5) رجّع الـ permissions بعد التحديث
  const updatedUser = await UserModel.findById(userId).select("permissions");

  SuccessResponse(res, {
    message: "Action permission removed successfully",
    permissions: updatedUser?.permissions || [],
  });
};