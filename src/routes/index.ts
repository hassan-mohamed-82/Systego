import { Router } from "express";
import authRouter from "./auth";
import brandRouter from "./brand";

export const route = Router();

route.use("/auth", authRouter);
route.use("/brand", brandRouter);


export default route;