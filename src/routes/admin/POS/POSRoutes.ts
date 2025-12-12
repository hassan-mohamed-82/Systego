import express from 'express';
import { createSale, getSalePendingById, getSales, getsalePending,getsaleunPending } from '../../../controller/admin/POS/saleController';
import { catchAsync } from '../../../utils/catchAsync';
const router = express.Router();

router.post('/sales', catchAsync(createSale));
router.get('/sales', catchAsync(getSales));
router.get('/sales/pending', catchAsync(getsalePending));
router.get('/sales/complete', catchAsync(getsaleunPending));
router.get("/sales/pending/:sale_id", getSalePendingById);


export default router;