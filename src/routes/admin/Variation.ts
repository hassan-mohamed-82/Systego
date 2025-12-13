import {Router} from "express";
import {
 createVariationWithOptions,getAllVariations,getOneVariation,deleteOption,updateVariationWithOptions,deleteVariationWithOptions
} from "../../controller/admin/Variation";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { createVariationSchema, updateVariationSchema } from "../../validation/admin/Variation";
import {authorizePermissions} from "../../middlewares/haspremission"
const router = Router();

router.post("/",authorizePermissions("variation","Add"),validate(createVariationSchema),catchAsync( createVariationWithOptions));
router.get("/",authorizePermissions("variation","View"), catchAsync(getAllVariations));
router.get("/:id",authorizePermissions("variation","View"), catchAsync(getOneVariation)); 
router.put("/:id", authorizePermissions("variation","Edit"),validate(updateVariationSchema) ,catchAsync(updateVariationWithOptions));
router.delete("/:id",authorizePermissions("variation","Delete"), catchAsync(deleteVariationWithOptions));
router.delete("/option/:id",authorizePermissions("variation","Delete"), catchAsync(deleteOption));


export default router;
