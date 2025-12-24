"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const RevenueController_1 = require("../../controller/admin/RevenueController");
const catchAsync_1 = require("../../utils/catchAsync");
const haspremission_1 = require("../../middlewares/haspremission");
const Route = (0, express_1.Router)();
// Create a new revenue
Route.post("/", (0, haspremission_1.authorizePermissions)("Revenue", "Add"), (0, catchAsync_1.catchAsync)(RevenueController_1.createRevenue));
// Get selection data (categories and accounts)
Route.get("/selection", (0, haspremission_1.authorizePermissions)("Revenue", "View"), (0, catchAsync_1.catchAsync)(RevenueController_1.selectionRevenue));
// Get all revenues for the authenticated admin
Route.get("/", (0, haspremission_1.authorizePermissions)("Revenue", "View"), (0, catchAsync_1.catchAsync)(RevenueController_1.getRevenues));
// Get a specific revenue by ID
Route.get("/:id", (0, haspremission_1.authorizePermissions)("Revenue", "View"), (0, catchAsync_1.catchAsync)(RevenueController_1.getRevenueById));
// Update a revenue
Route.put("/:id", (0, haspremission_1.authorizePermissions)("Revenue", "Edit"), (0, catchAsync_1.catchAsync)(RevenueController_1.updateRevenue));
exports.default = Route;
