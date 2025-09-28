import { Router } from "express";
 import userRouter from './users/index';
import adminRouter from './admin/index';
const route = Router();

route.use('/admin', adminRouter);

route.use('/user', userRouter);

export default route;