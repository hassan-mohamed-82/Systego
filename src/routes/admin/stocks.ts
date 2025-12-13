import { Router } from "express";
import {getStock, getStockById, createStock, uploadFinalFile}
 from "../../controller/admin/stock"
import {validate} from"../../middlewares/validation";
import {createStockSchema, finalStockSchema} from "../../validation/admin/stock"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
import {authorizePermissions} from "../../middlewares/haspremission"

const route = Router();

route.post("/finalFile" ,authorizePermissions("stock","Add"),validate(finalStockSchema), catchAsync(uploadFinalFile));
route.post("/" ,authorizePermissions("stock","Add"),validate(createStockSchema), catchAsync(createStock));
route.get("/",authorizePermissions("stock","View"),catchAsync(getStock));
route.get("/:id" ,authorizePermissions("stock","View"),catchAsync(getStockById));

export default route;
