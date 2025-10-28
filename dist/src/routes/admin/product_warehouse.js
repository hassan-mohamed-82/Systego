"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catchAsync_1 = require("../../utils/catchAsync");
const product_warehouse_1 = require("../../controller/admin/product_warehouse");
const router = (0, express_1.Router)();
router.get("/:warehouse_id", (0, catchAsync_1.catchAsync)(product_warehouse_1.getproductWarehouse));
router.get("/:id", (0, catchAsync_1.catchAsync)(product_warehouse_1.getproductWarehousebyid));
exports.default = router;
