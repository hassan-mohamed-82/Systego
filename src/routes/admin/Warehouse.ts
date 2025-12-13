import { Router } from "express";
import {createWarehouse,getWarehouseById,getWarehouses,updateWarehouse,deleteWarehouse
} from "../../controller/admin/Warehouse"
import {validate} from"../../middlewares/validation";
import {createWarehouseSchema,updateWarehouseSchema} from "../../validation/admin/Warehouse"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
import {authorizePermissions}from "../../middlewares/haspremission"

const route = Router();

route.post("/" ,authorizePermissions("warehouse","Add"),validate(createWarehouseSchema), catchAsync(createWarehouse));
route.get("/",authorizePermissions("warehouse","View"),catchAsync(getWarehouses));
route.get("/:id" ,authorizePermissions("warehouse","View"),  catchAsync(getWarehouseById));
route.put("/:id" ,authorizePermissions("warehouse","Edit"),validate(updateWarehouseSchema), catchAsync(updateWarehouse));
route.delete("/:id",authorizePermissions("warehouse","Delete"),catchAsync(deleteWarehouse));

export default route;