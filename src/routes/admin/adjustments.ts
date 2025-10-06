import { Router } from "express";
import { createAdjustment, getAdjustments, getAdjustmentById } from "../../controller/admin/adjustments";
import { validate } from "../../middlewares/validation";
import { createAdjustmentSchema, updateAdjustmentSchema } from "../../validation/admin/adjustments";
import { catchAsync } from "../../utils/catchAsync";
import { authorize } from "../../middlewares/authorized";
const route = Router();

route.post("/",authorize("adjustment","add"), validate(createAdjustmentSchema), catchAsync(createAdjustment));
route.get("/",authorize("get") ,catchAsync(getAdjustments));
route.get("/:id", authorize("get"),catchAsync(getAdjustmentById));

export default route;
