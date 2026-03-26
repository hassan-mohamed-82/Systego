import { Router } from "express";
import authRouter from "./auth"
import categoryRouter from "./Categoey";
import productRouter from "./products";
import brandRouter from "./brand";
import addressRouter from "./Address";
import cartRouter from "./Cart";
import orderRouter from "./Order";
import bannerRouter from "./banner";
import wishlistRouter from "./wishlist";
import paymentMethodRouter from "./paymentmethod";
import tenantInfoRouter from "../admin/tenantInfo";

const userRoute = Router();

userRoute.use("/tenant-info", tenantInfoRouter)
userRoute.use("/banner", bannerRouter);

userRoute.use("/auth", authRouter);
userRoute.use("/category", categoryRouter);
userRoute.use("/product", productRouter);
userRoute.use("/brand", brandRouter);
userRoute.use("/wishlist", wishlistRouter);

userRoute.use("/payment-methods", paymentMethodRouter);

userRoute.use("/address", addressRouter);
userRoute.use("/cart", cartRouter);
userRoute.use("/order", orderRouter);

export default userRoute;