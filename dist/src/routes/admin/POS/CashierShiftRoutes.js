"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const CashierShiftController_1 = require("../../../controller/admin/POS/CashierShiftController");
const router = express_1.default.Router();
router.post('/start', CashierShiftController_1.startcashierShift);
router.post('/logout', CashierShiftController_1.logout);
router.put('/end', CashierShiftController_1.endshiftcashier);
router.put('/end/report', CashierShiftController_1.endShiftWithReport);
exports.default = router;
