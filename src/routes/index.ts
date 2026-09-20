import { Router } from "express";
import userRouter from './users/index';
import adminRouter from './admin/index';
import SyncRouter from "./admin/POS/sync";
import { languageMiddleware } from "../middlewares/language";
const route = Router();

route.use('/sync', SyncRouter);

route.use(languageMiddleware);

route.use('/admin', adminRouter);

route.use('/store', userRouter);

export default route;