import { Router } from "express";
import {getOnePurchase, createPurchase,getPurchase,updatePurchase
} from "../../controller/admin/Purchase"
import {validate} from"../../middlewares/validation";
import {createPurchaseSchema, updatePurchaseSchema} from "../../validation/admin/Purchase"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";

const route = Router();

route.post("/" ,validate(createPurchaseSchema), catchAsync(createPurchase));
route.get("/",catchAsync(getPurchase));
route.get("/:id" ,catchAsync(getOnePurchase));
route.put("/:id" ,validate(updatePurchaseSchema), catchAsync(updatePurchase));

export default route;