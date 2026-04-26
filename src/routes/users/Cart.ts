import { Router } from 'express';
import { optionalAuthenticated } from '../../middlewares/optionalAuthenticated';
import { syncCart, getCart, clearCart, applyCoupon } from '../../controller/users/cart';
import { validate } from '../../middlewares/validation';
import { syncCartSchema, applyCouponSchema } from '../../validation/users/cart';

const cartRoute = Router();

cartRoute.use(optionalAuthenticated);

cartRoute.get("/", getCart);
cartRoute.post("/sync-cart", validate(syncCartSchema), syncCart);
cartRoute.post("/apply-coupon", validate(applyCouponSchema), applyCoupon);
cartRoute.delete("/clear", clearCart);

export default cartRoute;