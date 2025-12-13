import {Router} from "express";
import { catchAsync } from "../../utils/catchAsync";
import{
    createpoint,getpoints,getpoint,updatepoint,deletepoint
    
}from "../../controller/admin/points";

import { validate } from "../../middlewares/validation";
import { createPointSchema,updatePointSchema } from "../../validation/admin/points";
import {authorizePermissions} from "../../middlewares/haspremission"

const router=Router();

router.post("/",authorizePermissions("point","Add"),validate(createPointSchema),catchAsync(createpoint));
router.get("/",authorizePermissions("point","View"),catchAsync(getpoints));
router.get("/:id",authorizePermissions("point","View"),catchAsync(getpoint));
router.put("/:id",authorizePermissions("point","Edit"),validate(updatePointSchema),catchAsync(updatepoint));
router.delete("/:id",authorizePermissions("point","Delete"),catchAsync(deletepoint));
export default router;