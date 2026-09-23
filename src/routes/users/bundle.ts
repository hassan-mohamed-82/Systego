import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { getAllBundles, getBundleById } from '../../controller/users/bundle';

const route = Router();

route.get("/", catchAsync(getAllBundles));
route.get("/:id", catchAsync(getBundleById));

export default route;