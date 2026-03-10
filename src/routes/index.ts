import { Router } from "express";
 import userRouter from './users/index';
import adminRouter from './admin/index';
import storeRouter from '../store/routes/index';
const route = Router();

route.use('/admin', adminRouter);

route.use('/user', userRouter);

route.use('/store', storeRouter);

export default route;