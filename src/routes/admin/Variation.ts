import {Router} from "express";
import {
 createVariationWithOptions,getAllVariations,getOneVariation,updateVariationWithOptions,deleteVariationWithOptions
} from "../../controller/admin/Variation";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { createVariationSchema, updateVariationSchema } from "../../validation/admin/Variation";
const router = Router();

router.post("/",validate(createVariationSchema),catchAsync( createVariationWithOptions));
router.get("/", catchAsync(getAllVariations));
router.get("/:id", catchAsync(getOneVariation)); 
router.put("/:id",validate(updateVariationSchema) ,catchAsync(updateVariationWithOptions));
router.delete("/:id", catchAsync(deleteVariationWithOptions));


export default router;
