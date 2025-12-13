import { Router } from "express";
import { createAdjustment, getAdjustments, getAdjustmentById } from "../../controller/admin/adjustments";
import { validate } from "../../middlewares/validation";
import { createAdjustmentSchema, updateAdjustmentSchema } from "../../validation/admin/adjustments";
import { catchAsync } from "../../utils/catchAsync";
const route = Router();

route.post("/", validate(createAdjustmentSchema), catchAsync(createAdjustment));
route.get("/",catchAsync(getAdjustments));
route.get("/:id", catchAsync(getAdjustmentById));

export default route;
