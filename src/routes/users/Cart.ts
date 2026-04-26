import { Router } from 'express';
import { optionalAuthenticated } from '../../middlewares/optionalAuthenticated';
import { addToCart, getCart, updateQuantity, removeFromCart, clearCart, applyCoupon } from '../../controller/users/cart';
import { validate } from '../../middlewares/validation';
import { addToCartSchema, updateQuantitySchema, applyCouponSchema } from '../../validation/users/cart';

const cartRoute = Router();

cartRoute.use(optionalAuthenticated);

cartRoute.get("/", getCart);
cartRoute.post("/add", validate(addToCartSchema), addToCart);
cartRoute.post("/apply-coupon", validate(applyCouponSchema), applyCoupon);
cartRoute.put("/update-quantity", validate(updateQuantitySchema), updateQuantity);
cartRoute.delete("/remove/:productId", removeFromCart);
cartRoute.delete("/clear", clearCart);

export default cartRoute;