import {Router} from "express";
import { catchAsync } from "../../utils/catchAsync";
import{
createpoint,getpoints,getpoint,updatepoint,deletepoint
}from "../../controller/admin/redeem_Points";

import { validate } from "../../middlewares/validation";
import { createRedeemPointSchema,updateRedeemPointSchema } from "../../validation/admin/redeem_Points";
import {authorizePermissions} from "../../middlewares/haspremission"

const router=Router();

router.post("/",authorizePermissions("redeem_points","Add"),validate(createRedeemPointSchema),catchAsync(createpoint));
router.get("/",authorizePermissions("redeem_points","View"),catchAsync(getpoints));
router.get("/:id",authorizePermissions("redeem_points","View"),catchAsync(getpoint));
router.put("/:id",authorizePermissions("redeem_points","Edit"),validate(updateRedeemPointSchema),catchAsync(updatepoint));
router.delete("/:id",authorizePermissions("redeem_points","Delete"),catchAsync(deletepoint));
export default router;