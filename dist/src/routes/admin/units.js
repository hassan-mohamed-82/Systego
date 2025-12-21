"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const catchAsync_1 = require("../../utils/catchAsync");
const units_1 = require("../../controller/admin/units");
const router = express_1.default.Router();
router.post("/", (0, catchAsync_1.catchAsync)(units_1.createUnit));
router.get("/", (0, catchAsync_1.catchAsync)(units_1.getUnits));
router.get("/active", (0, catchAsync_1.catchAsync)(units_1.getActiveUnits));
router.get("/base", (0, catchAsync_1.catchAsync)(units_1.getBaseUnits));
router.get("/:id", (0, catchAsync_1.catchAsync)(units_1.getUnitById));
router.put("/:id", (0, catchAsync_1.catchAsync)(units_1.updateUnit));
router.delete("/:id", (0, catchAsync_1.catchAsync)(units_1.deleteUnit));
router.post("/delete-many", (0, catchAsync_1.catchAsync)(units_1.deleteManyUnits));
router.post("/convert", (0, catchAsync_1.catchAsync)(units_1.convertUnit));
exports.default = router;
