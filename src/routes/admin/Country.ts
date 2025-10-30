import { Router } from "express";
import {createCountry,getCountries,getCountryById,updateCountry,deleteCountry
} from "../../controller/admin/country"
import {validate} from"../../middlewares/validation";
import {updatecountrySchema,createcountrySchema} from "../../validation/admin/country"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
const route = Router();
route.post("/" ,validate(createcountrySchema), catchAsync(createCountry));
route.get("/",catchAsync(getCountries));
route.get("/:id" ,catchAsync(getCountryById));
route.put("/:id" ,validate(updatecountrySchema), catchAsync(updateCountry));
route.delete("/:id",catchAsync(deleteCountry));
export default route;
