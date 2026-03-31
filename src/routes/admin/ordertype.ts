import { Router } from "express";
import { getOrderTypes, updateOrderTypeStatus } from "../../controller/admin/ordertype";
import { authorizePermissions } from "../../middlewares/haspremission";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.get("/", authorizePermissions("orderType", "View"), catchAsync(getOrderTypes));
router.put("/:id", authorizePermissions("orderType", "Edit"), catchAsync(updateOrderTypeStatus));

export default router;
