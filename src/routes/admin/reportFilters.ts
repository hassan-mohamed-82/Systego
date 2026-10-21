import { Router } from "express";
import { getReportFilterOptions } from "../../controller/admin/reportFilters";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.get("/", catchAsync(getReportFilterOptions));

export default router;
