"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticated = authenticated;
const auth_1 = require("../utils/auth");
const unauthorizedError_1 = require("../Errors/unauthorizedError");
const roles_1 = require("../models/schema/admin/roles");
const User_1 = require("../models/schema/admin/User");
const constant_1 = require("../types/constant");
async function authenticated(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new unauthorizedError_1.UnauthorizedError("Invalid Token");
        }
        const token = authHeader.split(" ")[1];
        const decoded = (0, auth_1.verifyToken)(token);
        // ✅ جيب الـ permissions من الـ DB
        let permissions = [];
        if (decoded.role === "superadmin") {
            // Superadmin - كل الـ permissions
            permissions = constant_1.MODULES.map((mod) => ({
                module: mod,
                actions: constant_1.ACTION_NAMES.map((actionName, index) => ({
                    id: `superadmin_${mod}_${index}`,
                    action: actionName,
                })),
            }));
        }
        else if (decoded.role_id) {
            // Admin - جيب من Role + User
            const [roleData, userData] = await Promise.all([
                roles_1.RoleModel.findById(decoded.role_id).lean(),
                User_1.UserModel.findById(decoded.id).select("permissions").lean(),
            ]);
            const rolePermissions = (roleData?.permissions || []).map((p) => ({
                module: p.module,
                actions: (p.actions || []).map((a) => ({
                    id: a._id?.toString() || "",
                    action: a.action || "",
                })),
            }));
            const userPermissions = (userData?.permissions || []).map((p) => ({
                module: p.module,
                actions: (p.actions || []).map((a) => ({
                    id: a._id?.toString() || "",
                    action: a.action || "",
                })),
            }));
            permissions = mergePermissions(rolePermissions, userPermissions);
        }
        // ✅ حط الـ user + permissions في الـ request
        req.user = {
            ...decoded,
            permissions,
        };
        next();
    }
    catch (error) {
        next(error);
    }
}
// ✅ Helper: Merge permissions
function mergePermissions(rolePermissions, userPermissions) {
    const permissionMap = new Map();
    rolePermissions.forEach((p) => {
        if (!permissionMap.has(p.module)) {
            permissionMap.set(p.module, new Map());
        }
        p.actions.forEach((a) => {
            permissionMap.get(p.module).set(a.action, a);
        });
    });
    userPermissions.forEach((p) => {
        if (!permissionMap.has(p.module)) {
            permissionMap.set(p.module, new Map());
        }
        p.actions.forEach((a) => {
            permissionMap.get(p.module).set(a.action, a);
        });
    });
    const result = [];
    permissionMap.forEach((actionsMap, module) => {
        result.push({
            module,
            actions: Array.from(actionsMap.values()),
        });
    });
    return result;
}
