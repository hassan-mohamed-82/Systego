import { Router } from "express";
import {getPurchaseById, createPurchase,getAllPurchases,updatePurchase,getLowStockProducts
    ,getCriticalExpiryProducts,getExpiringProducts,getExpiredProducts
} from "../../controller/admin/Purchase"
import {validate} from"../../middlewares/validation";
import {createPurchaseSchema, updatePurchaseSchema} from "../../validation/admin/Purchase"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
import {authorizePermissions} from "../../middlewares/haspremission"

const route = Router();

route.post("/" ,authorizePermissions("purchase","Add"),validate(createPurchaseSchema), catchAsync(createPurchase));
route.get("/low-stock",authorizePermissions("purchase","View"),catchAsync(getLowStockProducts));
route.get("/critical-expiry",authorizePermissions("purchase","View"),catchAsync(getCriticalExpiryProducts));
route.get("/expiring",authorizePermissions("purchase","View"),catchAsync(getExpiringProducts));
route.get("/expired",authorizePermissions("purchase","View"),catchAsync(getExpiredProducts));
route.get("/",authorizePermissions("purchase","View"),catchAsync(getAllPurchases));
route.get("/:id" ,authorizePermissions("purchase","View"),catchAsync(getPurchaseById));
route.put("/:id" ,authorizePermissions("purchase","Edit"),validate(updatePurchaseSchema), catchAsync(updatePurchase));

export default route;