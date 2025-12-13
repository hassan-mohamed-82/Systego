import { Router } from "express";
import {createBrand,getBrandById,getBrands,updateBrand,deleteBrand} from "../../controller/admin/barnd"
import {validate} from"../../middlewares/validation";
import {createBrandSchema,updateBrandSchema} from "../../validation/admin/brand"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
import {authorizePermissions} from "../../middlewares/haspremission"

const route = Router();

route.post("/" ,authorizePermissions("brand","Add"),validate(createBrandSchema), catchAsync(createBrand));
route.get("/",authorizePermissions("brand","View"),catchAsync(getBrands));
route.get("/:id" ,authorizePermissions("brand","View"),catchAsync(getBrandById));
route.put("/:id" ,authorizePermissions("brand","Edit"),validate(updateBrandSchema), catchAsync(updateBrand));
route.delete("/:id",authorizePermissions("brand","Delete"),catchAsync(deleteBrand));

export default route;
