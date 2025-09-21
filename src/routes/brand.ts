import { Router } from "express";
import {createBrand,getBrandById,getBrands,updateBrand,deleteBrand} from "../controller/barnd"
import {validate} from"../middlewares/validation";
import {createBrandSchema,updateBrandSchema} from "../validation/brand"
import { catchAsync } from "../utils/catchAsync";
import { authenticated } from "../middlewares/authenticated";

const route = Router();

route.post("/" ,validate(createBrandSchema), catchAsync(createBrand));
route.get("/",catchAsync(getBrands));
route.get("/:id" ,catchAsync(getBrandById));
route.put("/:id" ,validate(updateBrandSchema), catchAsync(updateBrand));
route.delete("/:id",catchAsync(deleteBrand));

export default route;
