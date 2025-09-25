import { Router } from "express";
import {
  createBankAccount,
  getBankAccounts,
  getBankAccountById,
  updateBankAccount,
  deleteBankAccount,
} from "../../controller/admin/bank_accounts";
import { validate } from "../../middlewares/validation";
import { createBankAccountSchema, updateBankAccountSchema } from "../../validation/admin/bank_accounts";
import { catchAsync } from "../../utils/catchAsync";

const route = Router();

route.post("/", validate(createBankAccountSchema), catchAsync(createBankAccount));
route.get("/", catchAsync(getBankAccounts));
route.get("/:id", catchAsync(getBankAccountById));
route.put("/:id", validate(updateBankAccountSchema), catchAsync(updateBankAccount));
route.delete("/:id", catchAsync(deleteBankAccount));

export default route;
