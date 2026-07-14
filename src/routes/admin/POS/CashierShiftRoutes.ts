import express from 'express';
import {
    startcashierShift,
    endShiftWithReport,
    endshiftcashier,
    logout
} from '../../../controller/admin/POS/CashierShiftController';

import {authorizePermissions} from "../../../middlewares/haspremission"
import { closeCashierShift } from '../../../controller/admin/cashiershifts';
const router = express.Router();


router.post('/start',authorizePermissions("POS","Add"),authorizePermissions("cashier_shift","Add"), startcashierShift);
router.post('/logout',authorizePermissions("POS","Add"), logout);
router.put('/end',authorizePermissions("POS","Edit"),authorizePermissions("cashier_shift","Edit"), endshiftcashier);
router.put('/end/report',authorizePermissions("POS","Edit"),authorizePermissions("cashier_shift_report","Edit"),endShiftWithReport);
router.put("/close/:id",authorizePermissions("POS","Edit"),authorizePermissions("cashier_shift_report","Edit"), closeCashierShift);
export default router;