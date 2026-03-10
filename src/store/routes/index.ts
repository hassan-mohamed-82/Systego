import { Router } from "express";
import authRouter from "./auth";

const storeRouter = Router();

storeRouter.use("/auth", authRouter);

export default storeRouter;