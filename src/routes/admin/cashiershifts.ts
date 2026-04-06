import { Router } from "express";
import { closeCashierShift,getAllCashierShifts , getCashierShiftDetails} from "../../controller/admin/cashiershifts";
import { authorizePermissions } from "../../middlewares/haspremission";

const router = Router();

router.get("/",authorizePermissions("cashier_shift","View"), getAllCashierShifts);
router.get("/:id",authorizePermissions("cashier_shift","View"), getCashierShiftDetails);
router.put("/close/:id",authorizePermissions("cashier_shift","Edit"), closeCashierShift);
export default router;