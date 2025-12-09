"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.route = void 0;
const express_1 = require("express");
const Admin_1 = require("../../controller/admin/Admin");
const validation_1 = require("../../middlewares/validation");
const catchAsync_1 = require("../../utils/catchAsync");
const authorized_1 = require("../../middlewares/authorized");
const Admin_2 = require("../../validation/admin/Admin");
exports.route = (0, express_1.Router)();
exports.route.post("/", (0, authorized_1.authorize)("add"), (0, validation_1.validate)(Admin_2.createUserSchema), (0, catchAsync_1.catchAsync)(Admin_1.createUser));
exports.route.get("/", (0, authorized_1.authorize)("get"), (0, catchAsync_1.catchAsync)(Admin_1.getAllUsers));
exports.route.get("/selection", (0, authorized_1.authorize)("get"), (0, catchAsync_1.catchAsync)(Admin_1.selection));
exports.route.get("/:id", (0, authorized_1.authorize)("get"), (0, catchAsync_1.catchAsync)(Admin_1.getUserById));
exports.route.put("/:id", (0, authorized_1.authorize)("update"), (0, validation_1.validate)(Admin_2.updateUserSchema), (0, catchAsync_1.catchAsync)(Admin_1.updateUser));
exports.route.delete("/:id", (0, authorized_1.authorize)("delete"), (0, catchAsync_1.catchAsync)(Admin_1.deleteUser));
// Export the authRouter to be used in the main app
exports.default = exports.route;
