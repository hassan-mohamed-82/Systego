"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Warehouse_1 = require("../../controller/users/Warehouse");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
router.get("/", (0, catchAsync_1.catchAsync)(Warehouse_1.getWarehouses));
exports.default = router;
