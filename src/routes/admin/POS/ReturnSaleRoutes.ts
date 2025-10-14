import express from 'express';
import { createReturnSale, getAllReturnSales, getReturnSaleById, deleteReturnSale } from '../../../controller/admin/POS/ReturnSaleController';
const router = express.Router();

router.post('/', createReturnSale);

router.get('/', getAllReturnSales);
router.get('/:id', getReturnSaleById);

router.delete('/:id', deleteReturnSale);

export default router;