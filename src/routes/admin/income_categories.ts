import { Router } from "express";
import {createIncomeCategories,getIncomeCategories,getIncomeCategoriesById,updateIncomeCategoriesgory,deleteIncomeCategories} from "../../controller/admin/income_categories"
import {validate} from"../../middlewares/validation";
import {ExpenseCategorySchema,UpdateExpenseCategorySchema} from "../../validation/admin/ExpenseCategory"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";

const route = Router();

route.post("/" ,validate(ExpenseCategorySchema), catchAsync(createIncomeCategories));
route.get("/",catchAsync(getIncomeCategories));
route.get("/:id" ,catchAsync(getIncomeCategoriesById));
route.put("/:id" ,validate(UpdateExpenseCategorySchema), catchAsync(updateIncomeCategoriesgory));
route.delete("/:id",catchAsync(deleteIncomeCategories));

export default route;