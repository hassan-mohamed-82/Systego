import { Router } from "express";
import {createcategory,getCategoryById,getCategories,updateCategory,deleteCategory
} from "../../controller/admin/category"
import {validate} from"../../middlewares/validation";
import {createCategorySchema,updateCategorySchema} from "../../validation/admin/category"
import { catchAsync } from "../../utils/catchAsync";

const route = Router();

route.post("/" ,validate(createCategorySchema), catchAsync(createcategory));
route.get("/",catchAsync(getCategories));
route.get("/:id" ,catchAsync(getCategoryById));
route.put("/:id" ,validate(updateCategorySchema), catchAsync(updateCategory));
route.delete("/:id",catchAsync(deleteCategory));

export default route;
