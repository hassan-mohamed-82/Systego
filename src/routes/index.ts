import { Router } from "express";
import userRouter from './users/index';
import adminRouter from './admin/index';
const route = Router();

route.use('/admin', adminRouter);

route.use('/store', userRouter);

export default route;