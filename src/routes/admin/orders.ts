import { Router } from "express";
import {
    getAllOrders,
    getOrderById,
    getOrdersReport,
} from "../../controller/admin/orders";
import { authorizePermissions } from "../../middlewares/haspremission";

const router = Router();

// Report must come before /:id to avoid "report" being treated as an ID
router.get("/",   getAllOrders);
router.get("/report",   getOrdersReport);
router.get("/:id",   getOrderById);

export default router;
