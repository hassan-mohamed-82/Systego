import { Router } from "express";
import { createSelectReason,updateSelectReason,getSelectReason,deleteSelectReason } from "../../controller/admin/selectReason";
import { validate } from "../../middlewares/validation";
import { catchAsync } from "../../utils/catchAsync";
import {authorizePermissions} from "../../middlewares/haspremission"

const route = Router();

route.post("/", authorizePermissions("adjustment_reason","Add"), catchAsync(createSelectReason));
route.get("/",authorizePermissions("adjustment_reason","View"), catchAsync(getSelectReason));
route.put("/:id", authorizePermissions("adjustment_reason","Edit"), catchAsync(updateSelectReason));
route.delete("/:id",authorizePermissions("adjustment_reason","Delete"), catchAsync(deleteSelectReason));
export default route;