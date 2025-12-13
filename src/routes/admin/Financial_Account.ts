import { Router } from "express";
import {
  createBankAccount,
  getBankAccounts,
  getBankAccountById,
  updateBankAccount,
  deleteBankAccount,
} from "../../controller/admin/Financial_Account";
import { validate } from "../../middlewares/validation";
import { createBankAccountSchema, updateBankAccountSchema } from "../../validation/admin/Financial_Account";
import { catchAsync } from "../../utils/catchAsync";
import {authorizePermissions} from "../../middlewares/haspremission"

const route = Router();

route.post("/",authorizePermissions("financial_account","Add"), validate(createBankAccountSchema), catchAsync(createBankAccount));
route.get("/", authorizePermissions("financial_account","View"), catchAsync(getBankAccounts));
route.get("/:id",authorizePermissions("financial_account","View"), catchAsync(getBankAccountById));
route.put("/:id",authorizePermissions("financial_account","Edit"), validate(updateBankAccountSchema), catchAsync(updateBankAccount));
route.delete("/:id",authorizePermissions("financial_account","Delete"), catchAsync(deleteBankAccount));

export default route;
