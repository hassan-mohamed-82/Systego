"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserPermissionAction = exports.getUserPermissions = exports.updateUserPermissions = void 0;
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const mongoose_1 = __importDefault(require("mongoose"));
const constant_1 = require("../../types/constant");
const User_1 = require("../../models/schema/admin/User");
/** PUT /admin/users/:id/permissions */
const updateUserPermissions = async (req, res) => {
    const { id } = req.params;
    const { permissions } = req.body;
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new BadRequest_1.BadRequest("Invalid user id");
    }
    if (!Array.isArray(permissions)) {
        throw new BadRequest_1.BadRequest("permissions must be an array");
    }
    const user = await User_1.UserModel.findById(id);
    if (!user)
        throw new Errors_1.NotFound("User not found");
    // نعمل normalize للموديولات والأكشنز
    const cleaned = permissions
        .filter((p) => p.module && constant_1.MODULES.includes(p.module))
        .map((p) => {
        const normalizedActions = Array.isArray(p.actions)
            ? p.actions
                .map((a) => {
                // ممكن يجي string أو object
                if (typeof a === "string")
                    return a;
                if (a && typeof a.action === "string")
                    return a.action;
                return null;
            })
                .filter((a) => !!a && constant_1.ACTION_NAMES.includes(a))
            : [];
        // اللي هيتخزن في Mongo: [{ action: "View" }, ...]
        return {
            module: p.module,
            actions: normalizedActions.map((a) => ({ action: a })),
        };
    });
    user.permissions = cleaned;
    await user.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Permissions updated successfully",
        permissions: user.permissions,
    });
};
exports.updateUserPermissions = updateUserPermissions;
/** GET /admin/users/:id/permissions */
const getUserPermissions = async (req, res) => {
    const { id } = req.params;
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new BadRequest_1.BadRequest("Invalid user id");
    }
    const user = await User_1.UserModel.findById(id).select("permissions username email");
    if (!user)
        throw new Errors_1.NotFound("User not found");
    const userPerms = user.permissions || [];
    const permissions = constant_1.MODULES.map((mod) => {
        const found = userPerms.find((p) => p.module === mod);
        return {
            module: mod,
            actions: (found?.actions || []).map((a) => ({
                id: a._id.toString(),
                action: a.action,
            })),
        };
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Permissions fetched successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
        },
        permissions,
    });
};
exports.getUserPermissions = getUserPermissions;
const deleteUserPermissionAction = async (req, res) => {
    const { userId, module, actionId } = req.params;
    // 1) تحقق من الـ IDs
    if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
        throw new BadRequest_1.BadRequest("Invalid user id");
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(actionId)) {
        throw new BadRequest_1.BadRequest("Invalid action id");
    }
    // 2) تأكد إن الموديول صحيح
    if (!constant_1.MODULES.includes(module)) {
        throw new BadRequest_1.BadRequest("Invalid module name");
    }
    // 3) تأكد إن اليوزر موجود
    const user = await User_1.UserModel.findById(userId);
    if (!user)
        throw new Errors_1.NotFound("User not found");
    const actionObjectId = new mongoose_1.default.Types.ObjectId(actionId);
    // 4) احذف الـ action من الموديول المطلوب
    const result = await User_1.UserModel.updateOne({ _id: userId, "permissions.module": module }, {
        $pull: {
            "permissions.$.actions": { _id: actionObjectId },
        },
    });
    // لو مفيش ولا دوكيومنت اتعدل → احتمال الـ actionId مش موجود
    if (result.modifiedCount === 0) {
        throw new Errors_1.NotFound("Permission action not found for this module");
    }
    // 5) رجّع الـ permissions بعد التحديث
    const updatedUser = await User_1.UserModel.findById(userId).select("permissions");
    (0, response_1.SuccessResponse)(res, {
        message: "Action permission removed successfully",
        permissions: updatedUser?.permissions || [],
    });
};
exports.deleteUserPermissionAction = deleteUserPermissionAction;
