import { Router } from "express";
import {createExpenseCategory,updateExpenseCategory,deleteExpenseCategory,getExpenseCategory,getExpenseCategories} from "../controller/ExpenseCategory"
import {validate} from"../middlewares/validation";
import {ExpenseCategorySchema,UpdateExpenseCategorySchema} from "../validation/ExpenseCategory"
import { catchAsync } from "../utils/catchAsync";
import { authenticated } from "../middlewares/authenticated";

const route = Router();

route.post("/" ,validate(ExpenseCategorySchema), catchAsync(createExpenseCategory));
route.get("/",catchAsync(getExpenseCategories));
route.get("/:id" ,catchAsync(getExpenseCategory));
route.put("/:id" ,validate(UpdateExpenseCategorySchema), catchAsync(updateExpenseCategory));
route.delete("/:id",catchAsync(deleteExpenseCategory));

export default route;