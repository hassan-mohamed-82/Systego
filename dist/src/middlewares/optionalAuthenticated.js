"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticated = optionalAuthenticated;
const auth_1 = require("../utils/auth");
const roles_1 = require("../models/schema/admin/roles");
const User_1 = require("../models/schema/admin/User");
const constant_1 = require("../types/constant");
async function optionalAuthenticated(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next();
        }
        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = (0, auth_1.verifyToken)(token);
        }
        catch (err) {
            // If token is invalid, treat as guest
            return next();
        }
        if (!decoded) {
            return next();
        }
        // ✅ جيب الـ permissions من الـ DB (نفس منطق authenticated.ts)
        let permissions = [];
        if (decoded.role === "superadmin" ||
            (decoded.role === "admin" && !!decoded.warehouse_id && !decoded.role_id)) {
            permissions = constant_1.MODULES.map((mod) => ({
                module: mod,
                actions: constant_1.ACTION_NAMES.map((actionName, index) => ({
                    id: `${decoded.role}_${mod}_${index}`,
                    action: actionName,
                })),
            }));
        }
        else if (decoded.role_id) {
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
        // In case of any error during DB fetch, still proceed as guest or handle error?
        // Usually, if there's a token but we fail to fetch user data, it might be safer to just next()
        next();
    }
}
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
