import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {createpaymob,updatePaymob,getPaymob,getPaymobId} from "../../controller/admin/Paymob"
import {createPaymobSchema,updatePaymobSchema} from "../../validation/admin/Paymob"
import { validate } from "../../middlewares/validation";
import {authorizePermissions} from "../../middlewares/haspremission"

const router=Router();

router.get("/",authorizePermissions("paymob","View"),catchAsync(getPaymob))
router.post("/",authorizePermissions("paymob","Add"),validate(createPaymobSchema),catchAsync(createpaymob))
router.put("/:id",authorizePermissions("paymob","Edit"),validate(updatePaymobSchema),catchAsync(updatePaymob))
router.get("/:id",authorizePermissions("paymob","View"),catchAsync(getPaymobId))

export default router;