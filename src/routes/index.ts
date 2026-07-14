import { Router } from "express";
import userRouter from './users/index';
import adminRouter from './admin/index';
import SyncRouter from "./admin/POS/sync";
const route = Router();

route.use('/sync',SyncRouter)

route.use('/admin', adminRouter);

route.use('/store', userRouter);

export default route;