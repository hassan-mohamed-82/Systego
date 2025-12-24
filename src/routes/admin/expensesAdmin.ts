import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { getExpenseByIdAdmin,getExpensesAdmin,createExpenseAdmin,updateExpenseAdmin,getselectionExpenseAdmin } from "../../controller/admin/expensesAdmin";
import { authorizePermissions } from "../../middlewares/haspremission";

const router = Router();

router.get("/", authorizePermissions("expenseAdmin", "View"), catchAsync(getExpensesAdmin));
router.get("/selection", authorizePermissions("expenseAdmin", "View"), catchAsync(getselectionExpenseAdmin));
router.get("/:id", authorizePermissions("expenseAdmin", "View"), catchAsync(getExpenseByIdAdmin));
router.post("/", authorizePermissions("expenseAdmin", "Add"), catchAsync(createExpenseAdmin));
router.put("/:id", authorizePermissions("expenseAdmin", "Edit"), catchAsync(updateExpenseAdmin));
export default router;