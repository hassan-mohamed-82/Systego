import { Router } from "express";
import {createcategory,getCategories,getCategoryById,updateCategory,deleteCategory} from "../../controller/admin/Category_Material";
import { validate } from "../../middlewares/validation";
import { createCategoryMaterialSchema, updateCategoryMaterialSchema } from "../../validation/admin/Category_Material";
import { catchAsync } from "../../utils/catchAsync";
const router = Router();

router.post("/", validate(createCategoryMaterialSchema), catchAsync(createcategory));
router.get("/", catchAsync(getCategories));
router.get("/:id", catchAsync(getCategoryById));
router.put("/:id", validate(updateCategoryMaterialSchema), catchAsync(updateCategory));
router.delete("/:id", catchAsync(deleteCategory));

export default router;