import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authorizePermissions } from "../../middlewares/haspremission";
import { getReceivables, addReceivableTransaction } from "../../controller/admin/Receivable";

const route = Router();

route.get("/", authorizePermissions("POS", "View"), catchAsync(getReceivables));
route.post("/customer/:id/transaction", authorizePermissions("POS", "Add"), catchAsync(addReceivableTransaction));

export default route;
