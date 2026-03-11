import { Router } from "express";
import authRouter from "./auth"
import categoryRouter from "./Categoey";
import productRouter from "./products";
import brandRouter from "./brand";

const userRoute = Router();

userRoute.use("/auth", authRouter);
userRoute.use("/category", categoryRouter);
userRoute.use("/product", productRouter);
userRoute.use("/brand", brandRouter);

export default userRoute;