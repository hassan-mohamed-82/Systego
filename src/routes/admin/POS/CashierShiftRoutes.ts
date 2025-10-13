import express from 'express';
import {
    startCashierShift,
    endCashierShift
} from '../../../controller/admin/POS/CashierShiftController';
import { authorize } from '../../../middlewares/authorized';

const router = express.Router();


router.post('/start', authorize("shift","add"), startCashierShift);
router.put('/end/:shiftId', endCashierShift);

export default router;