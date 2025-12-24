"use strict";
// src/routes/admin/userRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catchAsync_1 = require("../../utils/catchAsync");
const Admin_1 = require("../../controller/admin/Admin");
const route = (0, express_1.Router)();
// Selection data (warehouses + roles)
route.get("/selection", (0, catchAsync_1.catchAsync)(Admin_1.getSelectionData));
// CRUD
route.post("/", (0, catchAsync_1.catchAsync)(Admin_1.createUser));
route.get("/", (0, catchAsync_1.catchAsync)(Admin_1.getAllUsers));
route.get("/:id", (0, catchAsync_1.catchAsync)(Admin_1.getUserById));
route.put("/:id", (0, catchAsync_1.catchAsync)(Admin_1.updateUser));
route.delete("/:id", (0, catchAsync_1.catchAsync)(Admin_1.deleteUser));
// Status toggle
// router.patch("/:id/status", catchAsync(toggleUserStatus));
exports.default = route;
