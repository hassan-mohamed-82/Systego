"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizePermissions = void 0;
const unauthorizedError_1 = require("../Errors/unauthorizedError");
const authorizePermissions = (moduleName, actionName) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            throw new unauthorizedError_1.UnauthorizedError("Unauthorized");
        }
        if (user.role === "superadmin") {
            return next();
        }
        if (user.role !== "admin") {
            throw new unauthorizedError_1.UnauthorizedError("You are not authorized to access this resource");
        }
        const perm = user.permissions?.find((p) => p.module === moduleName);
        if (!perm) {
            throw new unauthorizedError_1.UnauthorizedError(`No access to module: ${moduleName}`);
        }
        const hasAction = perm.actions?.some((a) => a.action === actionName);
        if (!hasAction) {
            throw new unauthorizedError_1.UnauthorizedError(`No permission: ${actionName} on ${moduleName}`);
        }
        return next();
    };
};
exports.authorizePermissions = authorizePermissions;
