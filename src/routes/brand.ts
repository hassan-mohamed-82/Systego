import { Router } from "express";
import {createBrand,getBrandById,getBrands,updateBrand,deleteBrand} from "../controller/barnd"
import {validate} from"../middlewares/validation";
import {createBrandSchema,updateBrandSchema} from "../validation/brand"
import { catchAsync } from "../utils/catchAsync";
import { authenticated } from "../middlewares/authenticated";
const route = Router();

route.post("/",authenticated ,validate(createBrandSchema), catchAsync(createBrand));
route.get("/", authenticated,catchAsync(getBrands));
route.get("/:id",authenticated ,catchAsync(getBrandById));
route.put("/:id",authenticated ,validate(updateBrandSchema), catchAsync(updateBrand));
route.delete("/:id", authenticated,catchAsync(deleteBrand));

export default route;
