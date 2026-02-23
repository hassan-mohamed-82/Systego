"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orders_1 = require("../../controller/admin/orders");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
// Report must come before /:id to avoid "report" being treated as an ID
router.get("/", (0, catchAsync_1.catchAsync)(orders_1.getAllOrders));
router.post("/report", (0, catchAsync_1.catchAsync)(orders_1.getOrdersReport));
router.get("/:id", (0, catchAsync_1.catchAsync)(orders_1.getOrderById));
exports.default = router;
