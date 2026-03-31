import { Router } from "express";
import { getWarehouses } from "../../controller/users/Warehouse";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.get("/", catchAsync(getWarehouses));

export default router;
