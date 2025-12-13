import { Router } from "express";
import {createcategory,getCategoryById,getCategories,updateCategory,deleteCategory
} from "../../controller/admin/category"
import {validate} from"../../middlewares/validation";
import {createCategorySchema,updateCategorySchema} from "../../validation/admin/category"
import { catchAsync } from "../../utils/catchAsync";
import {authorizePermissions} from "../../middlewares/haspremission"

const route = Router();

route.post("/" ,authorizePermissions("category","Add"),validate(createCategorySchema), catchAsync(createcategory));
route.get("/",authorizePermissions("category","View"),catchAsync(getCategories));
route.get("/:id" ,authorizePermissions("category","View"),catchAsync(getCategoryById));
route.put("/:id" ,authorizePermissions("category","Edit"),validate(updateCategorySchema), catchAsync(updateCategory));
route.delete("/:id",authorizePermissions("category","Delete"),catchAsync(deleteCategory));

export default route;
