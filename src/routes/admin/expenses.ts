import { Router } from "express";
import {
  createExpense,getExpenseById,getExpenses,updateExpense

} from "../../controller/admin/expenses"
import {validate} from"../../middlewares/validation";
import {createExpenseSchema,updateExpenseSchema} from "../../validation/admin/expenses"
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";

const route =Router();

route.post("/" ,validate(createExpenseSchema), catchAsync(createExpense));
route.get("/",catchAsync(getExpenses));
route.get("/:id" ,catchAsync(getExpenseById));
route.put("/:id" ,validate(updateExpenseSchema), catchAsync(updateExpense));

export default route;