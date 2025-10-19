import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { updatepayment,getpayments,getpaymentById } from "../../controller/admin/payments";
import { validate } from "../../middlewares/validation";
import { updatepaymentschema } from "../../validation/admin/payments";

const router = Router();

router.put("/:id",validate(updatepaymentschema),catchAsync(updatepayment));
router.get("/",catchAsync(getpayments));
router.get("/:id",catchAsync(getpaymentById));
export default router;
