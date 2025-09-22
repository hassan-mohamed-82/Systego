import { Router } from "express";
import {createcategory,getCategoryById,getCategories,updateCategory,deleteCategory
} from "../controller/category"
import {validate} from"../middlewares/validation";
import {createCategorySchema,updateCategorySchema} from "../validation/category"
import { catchAsync } from "../utils/catchAsync";
import { authenticated } from "../middlewares/authenticated";

const route = Router();

route.post("/" ,validate(createCategorySchema), catchAsync(createcategory));
route.get("/",catchAsync(getCategories));
route.get("/:id" ,catchAsync(getCategoryById));
route.put("/:id" ,validate(updateCategorySchema), catchAsync(updateCategory));
route.delete("/:id",catchAsync(deleteCategory));

export default route;
