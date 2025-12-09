import { Router } from "express";
import {
    createExpenseCategory, getExpenseCategories, updateExpenseCategory, getExpenseCategoryById, deleteExpenseCategory
} from "../../controller/admin/expensecategory";
import { catchAsync } from "../../utils/catchAsync";

const route = Router();
route.post("/", catchAsync(createExpenseCategory));
route.get("/", catchAsync(getExpenseCategories));
route.get("/:id", catchAsync(getExpenseCategoryById));
route.put("/:id", catchAsync(updateExpenseCategory));
route.delete("/:id", catchAsync(deleteExpenseCategory));
export default route;
