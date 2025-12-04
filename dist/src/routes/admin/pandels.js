"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pandels_1 = require("../../controller/admin/pandels");
const validation_1 = require("../../middlewares/validation");
const pandels_2 = require("../../validation/admin/pandels");
const catchAsync_1 = require("../../utils/catchAsync");
const route = (0, express_1.Router)();
// إنشاء بندل
route.post("/", (0, validation_1.validate)(pandels_2.createPandelSchema), (0, catchAsync_1.catchAsync)(pandels_1.createPandel));
// جلب جميع البندلات
route.get("/", (0, catchAsync_1.catchAsync)(pandels_1.getPandels));
// جلب بندل واحد
route.get("/:id", (0, catchAsync_1.catchAsync)(pandels_1.getPandelById));
// تحديث بندل
route.put("/:id", (0, validation_1.validate)(pandels_2.updatePandelSchema), (0, catchAsync_1.catchAsync)(pandels_1.updatePandel));
// حذف بندل
route.delete("/:id", (0, catchAsync_1.catchAsync)(pandels_1.deletePandel));
exports.default = route;
