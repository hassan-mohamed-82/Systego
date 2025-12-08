import express from 'express';
import {
    startcashierShift,
    endShiftWithReport,
    endshiftcashier
} from '../../../controller/admin/POS/CashierShiftController';
import { authorize } from '../../../middlewares/authorized';

const router = express.Router();


router.post('/start', startcashierShift);
router.put('/end', endshiftcashier);
router.put('/end/:shiftId/report', endShiftWithReport);

export default router;