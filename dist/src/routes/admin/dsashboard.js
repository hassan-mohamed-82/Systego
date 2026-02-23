"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dsashboard_1 = require("../../controller/admin/dsashboard");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
router.get('/', (0, catchAsync_1.catchAsync)(dsashboard_1.getDashboard));
router.get('/quick-stats', (0, catchAsync_1.catchAsync)(dsashboard_1.getQuickStats));
exports.default = router;
