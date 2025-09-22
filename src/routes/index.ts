import { Router } from "express";
import authRouter from "./auth";
import brandRouter from "./brand";
import AdminRouter from "./Admin";
import CategoryRouter from "./category";
import permissionRouter from './permission';
export const route = Router();

route.use("/auth", authRouter);
route.use("/brand", brandRouter);
route.use("/admin", AdminRouter);
route.use("/permission",permissionRouter);
route.use("/category",CategoryRouter);


export default route;