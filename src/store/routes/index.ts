import { Router } from "express";
import authRouter from "./auth";
import categoryRouter from "./categories";
import productRouter from "./products";

const storeRouter = Router();

storeRouter.use("/auth", authRouter);


storeRouter.use("/category", categoryRouter);
storeRouter.use("/product", productRouter);

export default storeRouter;