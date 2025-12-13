import { Router } from "express";
import {
  createExpense,getExpenses,updateExpense,selectionExpense,getExpenseById

} from "../../../controller/admin/POS/expenses"
import {validate} from"../../../middlewares/validation";
import {createExpenseSchema,updateExpenseSchema} from "../../../validation/admin/expenses"
import { catchAsync } from "../../../utils/catchAsync";
import { authenticated } from "../../../middlewares/authenticated";
import {authorizePermissions} from "../../../middlewares/haspremission"

const route =Router();

route.post("/" ,authorizePermissions("POS","Add"),validate(createExpenseSchema), catchAsync(createExpense));
route.get("/",authorizePermissions("POS","View"),catchAsync(getExpenses));
route.get("/selection",authorizePermissions("POS","View"),catchAsync(selectionExpense));
route.get("/:id",authorizePermissions("POS","View"),catchAsync( getExpenseById));
route.put("/:id" ,authorizePermissions("POS","Edit"),validate(updateExpenseSchema), catchAsync(updateExpense));

export default route;