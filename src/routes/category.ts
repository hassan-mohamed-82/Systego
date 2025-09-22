import { Router } from "express";
import {createcategory,getCategoryById,getCategories,updateCategory,deleteCategory
} from "../controller/category"
import {validate} from"../middlewares/validation";
import {createCategorySchema,updateCategorySchema} from "../validation/category"
import { catchAsync } from "../utils/catchAsync";
import { authenticated } from "../middlewares/authenticated";

const route = Router();

route.post("/" ,authenticated,validate(createCategorySchema), catchAsync(createcategory));
route.get("/",authenticated,catchAsync(getCategories));
route.get("/:id" ,authenticated,catchAsync(getCategoryById));
route.put("/:id",authenticated ,validate(updateCategorySchema), catchAsync(updateCategory));
route.delete("/:id",authenticated,catchAsync(deleteCategory));

export default route;
