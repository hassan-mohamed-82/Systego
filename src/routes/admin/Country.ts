import { Router } from "express";
import {createCountry,getCountries,getCountryById,updateCountry,deleteCountry
} from "../../controller/admin/country"
import {validate} from"../../middlewares/validation";
import {updatecountrySchema,createcountrySchema} from "../../validation/admin/country"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
import {authorizePermissions} from "../../middlewares/haspremission"

const route = Router();
route.post("/" ,authorizePermissions("country","Add"),validate(createcountrySchema), catchAsync(createCountry));
route.get("/",authorizePermissions("country","View"),catchAsync(getCountries));
route.get("/:id" ,authorizePermissions("country","View"),catchAsync(getCountryById));
route.put("/:id" ,authorizePermissions("country","Edit"),validate(updatecountrySchema), catchAsync(updateCountry));
route.delete("/:id",authorizePermissions("country","Delete"),catchAsync(deleteCountry));
export default route;
