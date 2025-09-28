import { Router } from "express";
import authRouter from "./auth/auth"
import categoryRouter from "./Categoey";
import brandRouter from "./brand";
import productRouter from './products';
import cartRouter from './carts';
import orderRouter from './Order';
import wishlistRouter from './wishlist'

const route = Router();


route.use("/auth", authRouter);
route.use("/category", categoryRouter);
route.use("/brand", brandRouter);
route.use("/product", productRouter);
route.use("/cart", cartRouter);
route.use("/order", orderRouter);
route.use("/wishlist", wishlistRouter)

export default route;