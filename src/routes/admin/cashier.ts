import { Router } from "express";
import {createCashier,getCashiers,updateCashier,deleteCashier,getBankAccounts} from "../../controller/admin/cashier";
import { catchAsync } from "../../utils/catchAsync";
import {authorizePermissions} from "../../middlewares/haspremission"

const router = Router();

router.post("/",authorizePermissions("cashier","Add"), catchAsync(createCashier));
router.get("/select", authorizePermissions("cashier","View"), catchAsync(getBankAccounts));
router.get("/", authorizePermissions("cashier","View"), catchAsync(getCashiers));
router.put("/:id",authorizePermissions("cashier","Edit"), catchAsync(updateCashier));
router.delete("/:id",authorizePermissions("cashier","Delete"), catchAsync(deleteCashier));

export default router;