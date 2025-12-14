import { Router } from "express";
import { getAllCashierShifts , getCashierShiftDetails} from "../../controller/admin/cashiershifts";
import { authorizePermissions } from "../../middlewares/haspremission";

const router = Router();

router.get("/",authorizePermissions("cashier_shift","View"), getAllCashierShifts);
router.get("/:id",authorizePermissions("cashier_shift","View"), getCashierShiftDetails);

export default router;