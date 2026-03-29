import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authorizePermissions } from "../../middlewares/haspremission";
import { getPayables, addPayableTransaction } from "../../controller/admin/Payable";

const route = Router();

route.get("/", authorizePermissions("purchase", "View"), catchAsync(getPayables));
route.post("/installment/:id/transaction", authorizePermissions("purchase", "Edit"), catchAsync(addPayableTransaction));

export default route;
