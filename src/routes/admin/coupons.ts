import { Router } from "express";
import {createcoupons,getcoupons,getcouponById,updatecoupon,deletecoupon
} from "../../controller/admin/coupons"
import {validate} from"../../middlewares/validation";
import {createCouponSchema,updateCouponSchema} from "../../validation/admin/coupons"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
import {authorizePermissions} from "../../middlewares/haspremission"

const route = Router();

route.post("/" ,authorizePermissions("coupon","Add"),validate(createCouponSchema), catchAsync(createcoupons));
route.get("/",authorizePermissions("coupon","View"),catchAsync(getcoupons));
route.get("/:id" ,authorizePermissions("coupon","View"),catchAsync(getcouponById));
route.put("/:id" ,authorizePermissions("coupon","Edit"),validate(updateCouponSchema), catchAsync(updatecoupon));
route.delete("/:id",authorizePermissions("coupon","Delete"),catchAsync(deletecoupon));

export default route;