"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orders_1 = require("../../controller/admin/orders");
const router = (0, express_1.Router)();
// Report must come before /:id to avoid "report" being treated as an ID
router.get("/", orders_1.getAllOrders);
router.get("/report", orders_1.getOrdersReport);
router.get("/:id", orders_1.getOrderById);
exports.default = router;
