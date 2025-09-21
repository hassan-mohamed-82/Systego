"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.route = void 0;
const express_1 = require("express");
const Admin_1 = require("../controller/Admin");
const validation_1 = require("../middlewares/validation");
const catchAsync_1 = require("../utils/catchAsync");
const authenticated_1 = require("../middlewares/authenticated");
const Admin_2 = require("../validation/Admin");
exports.route = (0, express_1.Router)();
exports.route.post("/", authenticated_1.authenticated, (0, validation_1.validate)(Admin_2.createUserSchema), (0, catchAsync_1.catchAsync)(Admin_1.createUser));
exports.route.get("/", authenticated_1.authenticated, (0, catchAsync_1.catchAsync)(Admin_1.getAllUsers));
exports.route.get("/:id", authenticated_1.authenticated, (0, catchAsync_1.catchAsync)(Admin_1.getUserById));
exports.route.put("/:id", authenticated_1.authenticated, (0, validation_1.validate)(Admin_2.updateUserSchema), (0, catchAsync_1.catchAsync)(Admin_1.updateUser));
exports.route.delete("/:id", authenticated_1.authenticated, (0, catchAsync_1.catchAsync)(Admin_1.deleteUser));
// Export the authRouter to be used in the main app
exports.default = exports.route;
