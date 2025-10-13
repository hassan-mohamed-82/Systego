import express from 'express';
import { createCustomerGroup } from '../../../controller/admin/POS/customerGroupController';

const router = express.Router();

router.post('/', createCustomerGroup);

export default router;