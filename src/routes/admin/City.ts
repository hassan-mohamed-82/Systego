import { Router } from "express";
import {createCity,getCities,getCityById,updateCity,deleteCity
} from "../../controller/admin/City"
import {validate} from"../../middlewares/validation";
import {createCitySchema,updateCitySchema} from "../../validation/admin/City"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
import {authorizePermissions} from "../../middlewares/haspremission"

const route = Router();

route.post("/" ,authorizePermissions("city","Add"),validate(createCitySchema), catchAsync(createCity));
route.get("/",authorizePermissions("city","View"),catchAsync(getCities));
route.get("/:id" ,authorizePermissions("city","View"),catchAsync(getCityById));
route.put("/:id" ,authorizePermissions("city","Edit"),validate(updateCitySchema), catchAsync(updateCity));
route.delete("/:id",authorizePermissions("city","Delete"),catchAsync(deleteCity));
export default route;
