import express from 'express';
import { createCustomerGroup } from '../../../controller/admin/POS/customerGroupController';
import { catchAsync } from '../../../utils/catchAsync';
const router = express.Router();

router.post('/', catchAsync(createCustomerGroup));

export default router;