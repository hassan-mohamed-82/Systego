import { Router } from "express";
import {createSupplier,getSupplierById,getSuppliers,updateSupplier,deleteSupplier
} from "../../controller/admin/suppliers"
import {validate} from"../../middlewares/validation";
import {createSupplierSchema,updateSupplierSchema} from "../../validation/admin/suppliers"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
import {authorizePermissions} from "../../middlewares/haspremission"

const route = Router();

route.post("/" ,authorizePermissions("Supplier","Add"),validate(createSupplierSchema), catchAsync(createSupplier));
route.get("/",authorizePermissions("Supplier","View"),catchAsync(getSuppliers));
route.get("/:id" ,authorizePermissions("Supplier","View"),catchAsync(getSupplierById));
route.put("/:id" ,authorizePermissions("Supplier","Edit"),validate(updateSupplierSchema), catchAsync(updateSupplier));
route.delete("/:id",authorizePermissions("Supplier","Delete"),catchAsync(deleteSupplier));

export default route;