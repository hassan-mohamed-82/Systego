import { Router } from "express";
import {createCity,getCities,getCityById,updateCity,deleteCity
} from "../../controller/admin/City"
import {validate} from"../../middlewares/validation";
import {createCitySchema,updateCitySchema} from "../../validation/admin/City"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
const route = Router();

route.post("/" ,validate(createCitySchema), catchAsync(createCity));
route.get("/",catchAsync(getCities));
route.get("/:id" ,catchAsync(getCityById));
route.put("/:id" ,validate(updateCitySchema), catchAsync(updateCity));
route.delete("/:id",catchAsync(deleteCity));
export default route;
