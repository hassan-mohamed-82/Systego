import {Router} from "express";
import { catchAsync } from "../../utils/catchAsync";
import{
    createPopup,getPopup,getPopupById,deletePopup,updatePopup
}from "../../controller/admin/Popup";

import { validate } from "../../middlewares/validation";
import { createPopupSchema,updatePopupSchema } from "../../validation/admin/Popup";
const router=Router();

router.post("/",validate(createPopupSchema),catchAsync(createPopup));
router.get("/",catchAsync(getPopup));
router.get("/:id",catchAsync(getPopupById));
router.put("/:id",validate(updatePopupSchema),catchAsync(updatePopup));
router.delete("/:id",catchAsync(deletePopup));
export default router;