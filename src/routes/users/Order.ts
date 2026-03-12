import { Router } from 'express';
import { authenticated } from '../../middlewares/authenticated';
import { createOrder, getMyOrders, getOrderDetails } from '../../controller/users/Order';
import { validate } from '../../middlewares/validation';
import { createOrderSchema } from '../../validation/users/order';

const orderRoute = Router();

orderRoute.use(authenticated);

orderRoute.post("/checkout", validate(createOrderSchema), createOrder);
orderRoute.get("/my-orders", getMyOrders);
orderRoute.get("/:id", getOrderDetails);

export default orderRoute;