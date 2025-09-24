"use strict";
// import { NextFunction, Response, RequestHandler } from "express";
// import { UnauthorizedError } from "../Errors/unauthorizedError";
// import { AuthenticatedRequest } from "../types/custom";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const authorize = (moduleName, actionName) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // ✅ superadmin يعدي على كل حاجة
        if (user.role === "superadmin") {
            return next();
        }
        // ✅ admin: لازم نتحقق من الـ module + action
        if (user.role === "admin") {
            // هل عنده role على الموديول ده؟
            const hasRole = user.roles.includes(moduleName);
            if (!hasRole) {
                return res.status(403).json({ message: `Forbidden: Missing role for ${moduleName}` });
            }
            // لو actionName مطلوب (زي add, update ...)
            if (actionName) {
                const hasAction = user.actions.includes(actionName);
                if (!hasAction) {
                    return res.status(403).json({ message: `Forbidden: Missing action ${actionName}` });
                }
            }
            return next();
        }
        // غير كده مرفوض
        return res.status(403).json({ message: "Forbidden: Invalid role" });
    };
};
exports.authorize = authorize;
