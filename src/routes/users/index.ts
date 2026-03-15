import { Router } from "express";
import authRouter from "./auth"
import categoryRouter from "./Categoey";
import productRouter from "./products";
import brandRouter from "./brand";
import addressRouter from "./Address";
import cartRouter from "./Cart";
// import orderRouter from "./Order";

const userRoute = Router();

userRoute.use("/auth", authRouter);
userRoute.use("/category", categoryRouter);
userRoute.use("/product", productRouter);
userRoute.use("/brand", brandRouter);

userRoute.use("/address", addressRouter);
userRoute.use("/cart", cartRouter);
// userRoute.use("/order", orderRouter);

export default userRoute;