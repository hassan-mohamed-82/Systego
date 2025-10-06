import { Router } from "express";
import { createSelectReason,updateSelectReason,getSelectReason,deleteSelectReason } from "../../controller/admin/selectReason";
import { validate } from "../../middlewares/validation";
import { catchAsync } from "../../utils/catchAsync";

const route = Router();

route.post("/",  catchAsync(createSelectReason));
route.get("/", catchAsync(getSelectReason));
route.put("/:id", catchAsync(updateSelectReason));
route.delete("/:id", catchAsync(deleteSelectReason));
export default route;