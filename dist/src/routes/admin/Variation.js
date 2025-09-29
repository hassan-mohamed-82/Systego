"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Variation_1 = require("../../controller/admin/Variation");
const catchAsync_1 = require("../../utils/catchAsync");
const validation_1 = require("../../middlewares/validation");
const Variation_2 = require("../../validation/admin/Variation");
const router = (0, express_1.Router)();
router.post("/", (0, validation_1.validate)(Variation_2.createVariationSchema), (0, catchAsync_1.catchAsync)(Variation_1.createVariation));
router.get("/", (0, catchAsync_1.catchAsync)(Variation_1.getVariations));
router.get("/:id", (0, catchAsync_1.catchAsync)(Variation_1.getVariationById));
router.put("/:id", (0, validation_1.validate)(Variation_2.updateVariationSchema), (0, catchAsync_1.catchAsync)(Variation_1.updateVariation));
router.delete("/:id", (0, catchAsync_1.catchAsync)(Variation_1.deleteVariation));
//option
router.put("/options/:optionId", (0, catchAsync_1.catchAsync)(Variation_1.updateOption));
router.delete("/options/:optionId", (0, catchAsync_1.catchAsync)(Variation_1.deleteOption));
router.post("/:variationId/options", (0, catchAsync_1.catchAsync)(Variation_1.addOptionToVariation));
exports.default = router;
