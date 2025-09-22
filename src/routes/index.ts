import { Router } from "express";
import authRouter from "./auth";
import brandRouter from "./brand";
import AdminRouter from "./Admin";
import CategoryRouter from "./category";
import permissionRouter from './permission';
import productRouter from './products';
import supplierRouter from './suppliers';
import BillerRouter from "./Biller"
import WarehouseRouter from "./Warehouse"
export const route = Router();

route.use("/auth", authRouter);
route.use("/brand", brandRouter);
route.use("/admin", AdminRouter);
route.use("/permission",permissionRouter);
route.use("/category",CategoryRouter);
route.use("/product",productRouter);
route.use("/supplier",supplierRouter);
route.use("/biller",BillerRouter);
route.use("/warehouse",WarehouseRouter)

export default route;