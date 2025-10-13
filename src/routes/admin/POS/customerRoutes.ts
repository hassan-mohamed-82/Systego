import express from 'express';
import { createCustomer } from '../../../controller/admin/POS/customer';
import { catchAsync } from '../../../utils/catchAsync';
const router = express.Router();

router.post('/', catchAsync(createCustomer));

export default router;