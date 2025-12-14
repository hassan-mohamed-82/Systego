import express from 'express';
import { createSale, getSalePendingById, getSales, getsalePending,getShiftCompletedSales } from '../../../controller/admin/POS/saleController';
import { catchAsync } from '../../../utils/catchAsync';
import { authorizePermissions } from '../../../middlewares/haspremission';
const router = express.Router();

router.post('/sales',authorizePermissions("POS","Add"), catchAsync(createSale));
router.get('/sales',authorizePermissions("POS","View"), catchAsync(getSales));
router.get('/sales/pending',authorizePermissions("POS","View"), catchAsync(getsalePending));
router.post('/sales/complete',authorizePermissions("POS","View"), catchAsync(getShiftCompletedSales));
router.get("/sales/pending/:sale_id",authorizePermissions("POS","View"), getSalePendingById);


export default router;