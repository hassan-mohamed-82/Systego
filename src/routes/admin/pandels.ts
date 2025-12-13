import { Router } from "express";
import{createPandel,getPandelById,getPandels,deletePandel,updatePandel} from "../../controller/admin/pandels";
import { validate } from "../../middlewares/validation";
import { createPandelSchema, updatePandelSchema } from "../../validation/admin/pandels";
import { catchAsync } from "../../utils/catchAsync";
import {authorizePermissions} from "../../middlewares/haspremission"

const route = Router();
// إنشاء بندل
route.post("/",authorizePermissions("pandel","Add"), validate(createPandelSchema), catchAsync(createPandel));
// جلب جميع البندلات
route.get("/",authorizePermissions("pandel","View"), catchAsync(getPandels));
// جلب بندل واحد
route.get("/:id",authorizePermissions("pandel","View"), catchAsync(getPandelById));
// تحديث بندل
route.put("/:id",authorizePermissions("pandel","Edit"), validate(updatePandelSchema), catchAsync(updatePandel));
// حذف بندل
route.delete("/:id",authorizePermissions("pandel","Delete"), catchAsync(deletePandel));
export default route;