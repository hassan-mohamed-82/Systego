import { Router } from "express";
import {createcoupons,getcoupons,getcouponById,updatecoupon,deletecoupon
} from "../../controller/admin/coupons"
import {validate} from"../../middlewares/validation";
import {createCouponSchema,updateCouponSchema} from "../../validation/admin/coupons"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";

const route = Router();

route.post("/" ,validate(createCouponSchema), catchAsync(createcoupons));
route.get("/",catchAsync(getcoupons));
route.get("/:id" ,catchAsync(getcouponById));
route.put("/:id" ,validate(updateCouponSchema), catchAsync(updatecoupon));
route.delete("/:id",catchAsync(deletecoupon));

export default route;