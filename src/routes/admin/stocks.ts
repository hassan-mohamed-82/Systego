import { Router } from "express";
import {getStock, getStockById, createStock, uploadFinalFile}
 from "../../controller/admin/stock"
import {validate} from"../../middlewares/validation";
import {createStockSchema, finalStockSchema} from "../../validation/admin/stock"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
const route = Router();

route.post("/finalFile" ,validate(finalStockSchema), catchAsync(uploadFinalFile));
route.post("/" ,validate(createStockSchema), catchAsync(createStock));
route.get("/",catchAsync(getStock));
route.get("/:id" ,catchAsync(getStockById));

export default route;
