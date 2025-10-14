"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const CashierShiftController_1 = require("../../../controller/admin/POS/CashierShiftController");
const authorized_1 = require("../../../middlewares/authorized");
const router = express_1.default.Router();
router.post('/start', (0, authorized_1.authorize)("shift", "add"), CashierShiftController_1.startCashierShift);
router.put('/end/:shiftId', CashierShiftController_1.endCashierShift);
exports.default = router;
