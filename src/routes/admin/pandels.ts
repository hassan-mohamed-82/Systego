import { Router } from "express";
import{createPandel,getPandelById,getPandels,deletePandel,updatePandel} from "../../controller/admin/pandels";
import { validate } from "../../middlewares/validation";
import { createPandelSchema, updatePandelSchema } from "../../validation/admin/pandels";
import { catchAsync } from "../../utils/catchAsync";

const route = Router();
// إنشاء بندل
route.post("/", validate(createPandelSchema), catchAsync(createPandel));
// جلب جميع البندلات
route.get("/", catchAsync(getPandels));
// جلب بندل واحد
route.get("/:id", catchAsync(getPandelById));
// تحديث بندل
route.put("/:id", validate(updatePandelSchema), catchAsync(updatePandel));
// حذف بندل
route.delete("/:id", catchAsync(deletePandel));
export default route;