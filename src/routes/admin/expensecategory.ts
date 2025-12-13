import { Router } from "express";
import {
    createExpenseCategory, getExpenseCategories, updateExpenseCategory, getExpenseCategoryById, deleteExpenseCategory
} from "../../controller/admin/expensecategory";
import { catchAsync } from "../../utils/catchAsync";
import {authorizePermissions} from "../../middlewares/haspremission"

const route = Router();
route.post("/",authorizePermissions("expense_category","Add"), catchAsync(createExpenseCategory));
route.get("/",authorizePermissions("expense_category","View"), catchAsync(getExpenseCategories));
route.get("/:id",authorizePermissions("expense_category","View"), catchAsync(getExpenseCategoryById));
route.put("/:id",authorizePermissions("expense_category","Edit"), catchAsync(updateExpenseCategory));
route.delete("/:id",authorizePermissions("expense_category","Delete"), catchAsync(deleteExpenseCategory));
export default route;
