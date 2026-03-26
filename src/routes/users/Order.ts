import { Router } from 'express';
import { authenticated } from '../../middlewares/authenticated';
import { createOrder, getMyOrders, getOrderDetails, paymobCallback, verifyPaymobPayment } from '../../controller/users/Order';
import { validate } from '../../middlewares/validation';
import { createOrderSchema } from '../../validation/users/order';
import { catchAsync } from '../../utils/catchAsync';

const orderRoute = Router();

orderRoute.get('/paymob/callback', catchAsync(paymobCallback));
orderRoute.post('/paymob/callback', catchAsync(paymobCallback));
orderRoute.post('/paymob/verify', catchAsync(verifyPaymobPayment));


orderRoute.post("/checkout", validate(createOrderSchema), catchAsync(createOrder));

orderRoute.use(authenticated);

orderRoute.get("/my-orders", catchAsync(getMyOrders));
orderRoute.get("/:id", catchAsync(getOrderDetails));

export default orderRoute;