import { Router } from "express";
import {
    getAllOrders,
    getOrderById,
    getOrdersReport,
} from "../../controller/admin/orders";
import { authorizePermissions } from "../../middlewares/haspremission";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

// Report must come before /:id to avoid "report" being treated as an ID
router.get("/", authorizePermissions("orders", "View"), catchAsync(getAllOrders));
router.get("/report", authorizePermissions("orders", "View"), catchAsync(getOrdersReport));
router.get("/:id", authorizePermissions("orders", "View"), catchAsync(getOrderById));

export default router;
