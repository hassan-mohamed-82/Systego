"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catchAsync_1 = require("../../utils/catchAsync");
const tenant_info_1 = require("../../controller/admin/tenant-info");
const router = (0, express_1.Router)();
/**
 * GET /api/admin/tenant-info
 *
 * Returns the tenant's subscription package info and feature flags.
 * The frontend can use this to show/hide ecommerce sections in the UI.
 */
router.get("/", (0, catchAsync_1.catchAsync)(tenant_info_1.getTenantInfoController));
/**
 * POST /api/admin/tenant-info/refresh
 *
 * Force clear the tenant cache and fetch fresh data from Super Systego.
 */
router.post("/refresh", (0, catchAsync_1.catchAsync)(tenant_info_1.refreshTenantInfoController));
exports.default = router;
