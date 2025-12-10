import { Router } from "express";
import {createCashier,getCashiers,updateCashier,deleteCashier,} from "../../controller/admin/cashier";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.post("/", catchAsync(createCashier));
router.get("/", catchAsync(getCashiers));
router.put("/:id", catchAsync(updateCashier));
router.delete("/:id", catchAsync(deleteCashier));

export default router;