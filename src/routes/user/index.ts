 import { Router } from "express";
import authRouter from "../user/auth/index";
 const route = Router();
route.use("/auth", authRouter);
 export default route;