"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const RevenueController_1 = require("../../controller/admin/RevenueController");
const RevenueRouter = (0, express_1.Router)();
// Get selection data (categories and accounts)
RevenueRouter.get("/selection", RevenueController_1.selectionRevenue);
// Get all revenues for the authenticated admin
RevenueRouter.get("/", RevenueController_1.getRevenues);
// Get a specific revenue by ID
RevenueRouter.get("/:id", RevenueController_1.getRevenueById);
// Create a new revenue
RevenueRouter.post("/", RevenueController_1.createRevenue);
// Update a revenue
RevenueRouter.put("/:id", RevenueController_1.updateRevenue);
exports.default = RevenueRouter;
