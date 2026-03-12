import { Router } from "express";
import { authorizePermissions } from "../../middlewares/haspremission";
import { catchAsync } from "../../utils/catchAsync";
import { getProductMovement, selection } from "../../controller/admin/productMovement";

const router = Router();

router.get("/", authorizePermissions("product_movement", "View"), catchAsync(getProductMovement));
router.get("/selection", authorizePermissions("product_movement", "View"), catchAsync(selection));

export default router;
