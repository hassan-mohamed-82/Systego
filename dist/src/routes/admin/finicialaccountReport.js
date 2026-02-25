"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const finicialaccountReport_1 = require("../../controller/admin/finicialaccountReport");
const catchAsync_1 = require("../../utils/catchAsync");
const haspremission_1 = require("../../middlewares/haspremission");
const router = (0, express_1.Router)();
router.get("/", (0, haspremission_1.authorizePermissions)("financial_report", "View"), (0, catchAsync_1.catchAsync)(finicialaccountReport_1.getFinancialReport));
exports.default = router;
