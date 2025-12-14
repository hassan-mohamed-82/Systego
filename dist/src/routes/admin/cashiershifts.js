"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cashiershifts_1 = require("../../controller/admin/cashiershifts");
const haspremission_1 = require("../../middlewares/haspremission");
const router = (0, express_1.Router)();
router.get("/", (0, haspremission_1.authorizePermissions)("cashier_shift", "View"), cashiershifts_1.getAllCashierShifts);
router.get("/:id", (0, haspremission_1.authorizePermissions)("cashier_shift", "View"), cashiershifts_1.getCashierShiftDetails);
exports.default = router;
