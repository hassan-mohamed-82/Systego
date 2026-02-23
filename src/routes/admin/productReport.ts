import { Router } from "express";
import { authorizePermissions } from "../../middlewares/haspremission";
import { catchAsync } from "../../utils/catchAsync";
import { getProductSalesReport } from "../../controller/admin/productReport";
const router = Router();

router.get("/", authorizePermissions("product", "View"), catchAsync(getProductSalesReport));

export default router;