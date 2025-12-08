import express from 'express';
import { createSale, updateSaleStatus, getSaleById, getSales, getSalesByStatus } from '../../../controller/admin/POS/saleController';

const router = express.Router();

router.post('/sales', createSale)
router.get('/sales/:saleId', getSaleById)
router.get('/sales', getSales)
router.get('/sales/status/:status', getSalesByStatus)
router.put('/sales/:saleId/status', updateSaleStatus)


export default router;