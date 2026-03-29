import { Router } from 'express';
import { optionalAuthenticated } from '../../middlewares/optionalAuthenticated';
import { createOrder, getMyOrders, getOrderDetails, verifyPaymobPaymentStatus } from '../../controller/users/Order';
import { validate } from '../../middlewares/validation';
import { createOrderSchema } from '../../validation/users/order';
import { catchAsync } from '../../utils/catchAsync';
import { paymobWebhook } from '../../utils/paymobWebhook';
import { geideaWebhook } from '../../utils/geadiawebhook';
const orderRoute = Router();

orderRoute.get("/webhook/paymob", catchAsync(paymobWebhook));
orderRoute.post("/webhook/paymob", catchAsync(paymobWebhook));
orderRoute.get("/webhook/geidea", catchAsync(geideaWebhook));
orderRoute.post("/webhook/geidea", catchAsync(geideaWebhook));
orderRoute.use(optionalAuthenticated);

orderRoute.post("/checkout", catchAsync(createOrder));
orderRoute.get("/verify-payment/paymob/:orderId", catchAsync(verifyPaymobPaymentStatus));
orderRoute.get("/my-orders", catchAsync(getMyOrders));
orderRoute.get("/:id", catchAsync(getOrderDetails));

export default orderRoute;