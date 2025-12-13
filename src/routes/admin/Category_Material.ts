import { Router } from "express";
import {createcategory,getCategories,getCategoryById,updateCategory,deleteCategory} from "../../controller/admin/Category_Material";
import { validate } from "../../middlewares/validation";
import { createCategoryMaterialSchema, updateCategoryMaterialSchema } from "../../validation/admin/Category_Material";
import { catchAsync } from "../../utils/catchAsync";
import {authorizePermissions} from "../../middlewares/haspremission"

const router = Router();

router.post("/",authorizePermissions("Category_Material","Add"), validate(createCategoryMaterialSchema), catchAsync(createcategory));
router.get("/",authorizePermissions("Category_Material","View"), catchAsync(getCategories));
router.get("/:id",authorizePermissions("Category_Material","View"), catchAsync(getCategoryById));
router.put("/:id",authorizePermissions("Category_Material","Edit"), validate(updateCategoryMaterialSchema), catchAsync(updateCategory));
router.delete("/:id",authorizePermissions("Category_Material","Delete"), catchAsync(deleteCategory));

export default router;