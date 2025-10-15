import {Router} from "express";
import { catchAsync } from "../../utils/catchAsync";
import{
createpoint,getpoints,getpoint,updatepoint,deletepoint
}from "../../controller/admin/redeem_Points";

import { validate } from "../../middlewares/validation";
import { createRedeemPointSchema,updateRedeemPointSchema } from "../../validation/admin/redeem_Points";
const router=Router();

router.post("/",validate(createRedeemPointSchema),catchAsync(createpoint));
router.get("/",catchAsync(getpoints));
router.get("/:id",catchAsync(getpoint));
router.put("/:id",validate(updateRedeemPointSchema),catchAsync(updatepoint));
router.delete("/:id",catchAsync(deletepoint));
export default router;