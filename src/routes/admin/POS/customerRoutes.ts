import express from 'express';
import { createCustomer } from '../../../controller/admin/POS/customer';

const router = express.Router();

router.post('/', createCustomer);

export default router;