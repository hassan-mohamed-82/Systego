import {Router} from "express";
import { catchAsync } from "../../utils/catchAsync";
import{
    createpoint,getpoints,getpoint,updatepoint,deletepoint
    
}from "../../controller/admin/points";

import { validate } from "../../middlewares/validation";
import { createPointSchema,updatePointSchema } from "../../validation/admin/points";
const router=Router();

router.post("/",validate(createPointSchema),catchAsync(createpoint));
router.get("/",catchAsync(getpoints));
router.get("/:id",catchAsync(getpoint));
router.put("/:id",validate(updatePointSchema),catchAsync(updatepoint));
router.delete("/:id",catchAsync(deletepoint));
export default router;