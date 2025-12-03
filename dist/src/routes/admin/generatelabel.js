"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const genrateLabel_1 = require("../../controller/admin/genrateLabel");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
router.get("/sizes", (0, catchAsync_1.catchAsync)(genrateLabel_1.getAvailableLabelSizes));
router.post("/generate", (0, catchAsync_1.catchAsync)(genrateLabel_1.generateLabelsController));
exports.default = router;
