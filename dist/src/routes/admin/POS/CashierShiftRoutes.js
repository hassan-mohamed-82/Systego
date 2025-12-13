"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const CashierShiftController_1 = require("../../../controller/admin/POS/CashierShiftController");
const haspremission_1 = require("../../../middlewares/haspremission");
const router = express_1.default.Router();
router.post('/start', (0, haspremission_1.authorizePermissions)("POS", "Add"), (0, haspremission_1.authorizePermissions)("cashier_shift", "Add"), CashierShiftController_1.startcashierShift);
router.post('/logout', (0, haspremission_1.authorizePermissions)("POS", "Add"), CashierShiftController_1.logout);
router.put('/end', (0, haspremission_1.authorizePermissions)("POS", "Edit"), (0, haspremission_1.authorizePermissions)("cashier_shift", "Edit"), CashierShiftController_1.endshiftcashier);
router.put('/end/report', (0, haspremission_1.authorizePermissions)("POS", "Edit"), (0, haspremission_1.authorizePermissions)("cashier_shift_report", "Edit"), CashierShiftController_1.endShiftWithReport);
exports.default = router;
