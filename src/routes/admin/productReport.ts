import { Router } from "express";
import { authorizePermissions } from "../../middlewares/haspremission";
import { catchAsync } from "../../utils/catchAsync";
import { getProductSalesReport, selection } from "../../controller/admin/productReport";
const router = Router();

router.get("/", authorizePermissions("product", "View"), catchAsync(getProductSalesReport));
router.get("/selection", authorizePermissions("product", "View"), catchAsync(selection));

export default router;