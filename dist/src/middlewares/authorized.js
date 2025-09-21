"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const unauthorizedError_1 = require("../Errors/unauthorizedError");
// authorize("UserManagement", "add")
const authorize = (requiredRole, requiredAction) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            throw new unauthorizedError_1.UnauthorizedError("Not authenticated");
        }
        const userRoles = user.roles || [];
        const userActions = user.actions || [];
        // ✅ لازم يبقى معاه الرول المطلوب
        if (!userRoles.includes(requiredRole)) {
            throw new unauthorizedError_1.UnauthorizedError("You don't have the required role");
        }
        // ✅ ولازم يبقى معاه الـ action المطلوب
        if (!userActions.includes(requiredAction)) {
            throw new unauthorizedError_1.UnauthorizedError("You don't have the required action");
        }
        next();
    };
};
exports.authorize = authorize;
