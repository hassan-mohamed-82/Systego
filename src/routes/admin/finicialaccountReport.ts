import { Router } from "express";
import { getFinancialReport } from "../../controller/admin/finicialaccountReport";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.post("/", catchAsync(getFinancialReport));

export default router;