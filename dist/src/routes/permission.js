"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const permission_1 = require("../controller/permission");
const validation_1 = require("../middlewares/validation");
const permission_2 = require("../validation/permission");
const catchAsync_1 = require("../utils/catchAsync");
const authenticated_1 = require("../middlewares/authenticated");
const route = (0, express_1.Router)();
route.post("/", authenticated_1.authenticated, (0, validation_1.validate)(permission_2.createPositionWithRolesAndActionsSchema), (0, catchAsync_1.catchAsync)(permission_1.createPositionWithRolesAndActions));
route.get("/", authenticated_1.authenticated, (0, catchAsync_1.catchAsync)(permission_1.getAllPositions));
route.get("/:id", authenticated_1.authenticated, (0, catchAsync_1.catchAsync)(permission_1.getPositionById));
route.put("/:id", authenticated_1.authenticated, (0, validation_1.validate)(permission_2.updatePositionWithRolesAndActionsSchema), (0, catchAsync_1.catchAsync)(permission_1.updatePosition));
route.delete("/:id", authenticated_1.authenticated, (0, catchAsync_1.catchAsync)(permission_1.deletePosition));
// Export the authRouter to be used in the main app
exports.default = route;
