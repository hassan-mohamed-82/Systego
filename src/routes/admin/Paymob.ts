import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import {createpaymob,updatePaymob,getPaymob,getPaymobId} from "../../controller/admin/Paymob"
import {createPaymobSchema,updatePaymobSchema} from "../../validation/admin/Paymob"
import { validate } from "../../middlewares/validation";

const router=Router();

router.get("/",catchAsync(getPaymob))
router.post("/",validate(createPaymobSchema),catchAsync(createpaymob))
router.put("/:id",validate(updatePaymobSchema),catchAsync(updatePaymob))
router.get("/:id",catchAsync(getPaymobId))

export default router;