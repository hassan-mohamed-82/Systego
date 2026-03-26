import { Router } from 'express';
import { authenticated } from '../../middlewares/authenticated';
import { createOrder, getMyOrders, getOrderDetails } from '../../controller/users/Order';
import { validate } from '../../middlewares/validation';
import { createOrderSchema } from '../../validation/users/order';
import { catchAsync } from '../../utils/catchAsync';
import { paymobWebhook } from '../../utils/paymobWebhook';
const orderRoute = Router();

orderRoute.post("/webhook/paymob", catchAsync(paymobWebhook));

// orderRoute.use(authenticated);

orderRoute.post("/checkout", catchAsync(createOrder));
orderRoute.get("/my-orders", catchAsync(getMyOrders));
orderRoute.get("/:id", catchAsync(getOrderDetails));

export default orderRoute;