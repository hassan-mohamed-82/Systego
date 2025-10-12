import express from 'express';
import { createSale } from '../../../controller/admin/POS/saleController';

const router = express.Router();

router.post('/sales', createSale);

export default router;