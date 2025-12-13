"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const permission_1 = require("../../controller/admin/permission");
const catchAsync_1 = require("../../utils/catchAsync");
const route = (0, express_1.Router)();
route.put("/:id", (0, catchAsync_1.catchAsync)(permission_1.updateUserPermissions));
route.get("/:id", (0, catchAsync_1.catchAsync)(permission_1.getUserPermissions));
route.delete("/:userId/:module/:actionId", (0, catchAsync_1.catchAsync)(permission_1.deleteUserPermissionAction));
// Export the authRouter to be used in the main app
exports.default = route;
