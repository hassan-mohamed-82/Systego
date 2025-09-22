import { Router } from "express";
import authRouter from "./auth";
import brandRouter from "./brand";
import AdminRouter from "./Admin";
import CategoryRouter from "./category";
export const route = Router();

route.use("/auth", authRouter);
route.use("/brand", brandRouter);
route.use("/admin", AdminRouter);
route.use("/category",CategoryRouter)


export default route;