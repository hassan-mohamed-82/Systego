"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizePermissions = void 0;
const unauthorizedError_1 = require("../Errors/unauthorizedError");
const authorizePermissions = (module, action) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            throw new unauthorizedError_1.UnauthorizedError("Not authenticated");
        }
        // Superadmin bypasses all checks
        if (user.role === "superadmin") {
            return next();
        }
        const modulePermission = user.permissions?.find((p) => p.module === module);
        if (!modulePermission) {
            throw new unauthorizedError_1.UnauthorizedError(`No access to ${module} module`);
        }
        const hasAction = modulePermission.actions.some((a) => a.action === action);
        if (!hasAction) {
            throw new unauthorizedError_1.UnauthorizedError(`No permission to ${action} in ${module}`);
        }
        next();
    };
};
exports.authorizePermissions = authorizePermissions;
