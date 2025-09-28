import express from 'express';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  getUserOrders
} from '../../controller/users/Order';
import { authenticated } from '../../middlewares/authenticated';

const router = express.Router();

router.use(authenticated)

router.post('/', createOrder);
router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.get('/user', getUserOrders);

export default router;