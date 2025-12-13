import { Router } from "express";
import {getOnePurchase, createPurchase,getPurchase,updatePurchase
} from "../../controller/admin/Purchase"
import {validate} from"../../middlewares/validation";
import {createPurchaseSchema, updatePurchaseSchema} from "../../validation/admin/Purchase"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
import {authorizePermissions} from "../../middlewares/haspremission"

const route = Router();

route.post("/" ,authorizePermissions("purchase","Add"),validate(createPurchaseSchema), catchAsync(createPurchase));
route.get("/",authorizePermissions("purchase","View"),catchAsync(getPurchase));
route.get("/:id" ,authorizePermissions("purchase","View"),catchAsync(getOnePurchase));
route.put("/:id" ,authorizePermissions("purchase","Edit"),validate(updatePurchaseSchema), catchAsync(updatePurchase));

export default route;