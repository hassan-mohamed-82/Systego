import { Router } from 'express';
import { authenticated } from '../../middlewares/authenticated';
import { addToCart, getCart, updateQuantity, removeFromCart, clearCart } from '../../controller/users/cart';
import { validate } from '../../middlewares/validation';
import { addToCartSchema, updateQuantitySchema } from '../../validation/users/cart';

const cartRoute = Router();

// cartRoute.use(authenticated);

cartRoute.get("/", getCart);
cartRoute.post("/add", validate(addToCartSchema), addToCart);
cartRoute.put("/update-quantity", validate(updateQuantitySchema), updateQuantity);
cartRoute.delete("/remove/:productId", removeFromCart);
cartRoute.delete("/clear", clearCart);

export default cartRoute;