"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const haspremission_1 = require("../../middlewares/haspremission");
const catchAsync_1 = require("../../utils/catchAsync");
const productReport_1 = require("../../controller/admin/productReport");
const router = (0, express_1.Router)();
router.get("/", (0, haspremission_1.authorizePermissions)("product", "View"), (0, catchAsync_1.catchAsync)(productReport_1.getProductSalesReport));
exports.default = router;
