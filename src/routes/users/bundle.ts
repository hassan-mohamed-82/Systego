import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { getAllBundles } from '../../controller/users/bundle';
const route = Router()

route.get("/",catchAsync(getAllBundles))

export default route