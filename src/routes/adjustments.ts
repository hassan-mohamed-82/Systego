import { Router } from "express";
import { createAdjustment, getAdjustments, getAdjustmentById, updateAdjustment, deleteAdjustment } from "../controller/adjustments";
import { validate } from "../middlewares/validation";
import { createAdjustmentSchema, updateAdjustmentSchema } from "../validation/adjustments";
import { catchAsync } from "../utils/catchAsync";

const route = Router();

route.post("/", validate(createAdjustmentSchema), catchAsync(createAdjustment));
route.get("/", catchAsync(getAdjustments));
route.get("/:id", catchAsync(getAdjustmentById));
route.put("/:id", validate(updateAdjustmentSchema), catchAsync(updateAdjustment));
route.delete("/:id", catchAsync(deleteAdjustment));

export default route;
