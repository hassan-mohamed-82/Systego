import express from 'express';
import {
    startcashierShift,
    endShiftWithReport,
    endshiftcashier,
    logout
} from '../../../controller/admin/POS/CashierShiftController';
import { authorize } from '../../../middlewares/authorized';

const router = express.Router();


router.post('/start', startcashierShift);
router.post('/logout', logout);
router.put('/end', endshiftcashier);
router.put('/end/report', endShiftWithReport);

export default router;