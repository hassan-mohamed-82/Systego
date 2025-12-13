import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { updatepayment,getpayments,getpaymentById } from "../../controller/admin/payments";
import { validate } from "../../middlewares/validation";
import { updatepaymentschema } from "../../validation/admin/payments";
import {authorizePermissions} from "../../middlewares/haspremission"

const router = Router();

router.put("/:id",authorizePermissions("payment","Edit"),validate(updatepaymentschema),catchAsync(updatepayment));
router.get("/",authorizePermissions("payment","View"),catchAsync(getpayments));
router.get("/:id",authorizePermissions("payment","View"),catchAsync(getpaymentById));
export default router;
