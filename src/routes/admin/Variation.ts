import {Router} from "express";
import {
  createVariation,
  getVariations,
  getVariationById,
  updateVariation,
  deleteVariation,
  deleteOption,
  updateOption
} from "../../controller/admin/Variation";
import { catchAsync } from "../../utils/catchAsync";
import { validate } from "../../middlewares/validation";
import { createVariationSchema, updateVariationSchema } from "../../validation/admin/Variation";
const router = Router();

router.post("/",validate(createVariationSchema),catchAsync( createVariation));
router.get("/", catchAsync(getVariations));
router.get("/:id", catchAsync(getVariationById)); 
router.put("/:id",validate(updateVariationSchema) ,catchAsync(updateVariation));
router.delete("/:id", catchAsync(deleteVariation));


//option
router.put("/options/:optionId", catchAsync(updateOption));
router.delete("/options/:optionId", catchAsync(deleteOption));

export default router;
