import { Router } from "express";
import { getFinancialReport } from "../../controller/admin/finicialaccountReport";
import { catchAsync } from "../../utils/catchAsync";
import { authorizePermissions } from "../../middlewares/haspremission";

const router = Router();

router.get("/", authorizePermissions("financial_report", "View"), catchAsync(getFinancialReport));

export default router;