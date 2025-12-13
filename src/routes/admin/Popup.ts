import {Router} from "express";
import { catchAsync } from "../../utils/catchAsync";
import{
    createPopup,getPopup,getPopupById,deletePopup,updatePopup
}from "../../controller/admin/Popup";

import { validate } from "../../middlewares/validation";
import { createPopupSchema,updatePopupSchema } from "../../validation/admin/Popup";
import {authorizePermissions} from "../../middlewares/haspremission"

const router=Router();

router.post("/",authorizePermissions("popup","Add"),validate(createPopupSchema),catchAsync(createPopup));
router.get("/",authorizePermissions("popup","View"),catchAsync(getPopup));
router.get("/:id",authorizePermissions("popup","View"),catchAsync(getPopupById));
router.put("/:id",authorizePermissions("popup","Edit"),validate(updatePopupSchema),catchAsync(updatePopup));
router.delete("/:id",authorizePermissions("popup","Delete"),catchAsync(deletePopup));
export default router;