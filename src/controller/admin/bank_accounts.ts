import { Request, Response } from "express";
import { BankAccountModel } from "../../models/schema/admin/bank_accounts";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

// ✅ Create
export const createBankAccount = async (req: Request, res: Response) => {
  const { account_no, name, initial_balance, is_default, note } = req.body;

  if (!account_no || !name || initial_balance === undefined) {
    throw new BadRequest("Please provide all required fields");
  }

  const exists = await BankAccountModel.findOne({ account_no });
  if (exists) throw new BadRequest("Account number already exists");

  // ✅ لو الحساب دا هو الـ default، خلّي الباقي false
  if (is_default) {
    await BankAccountModel.updateMany({}, { is_default: false });
  }

  const bankAccount = await BankAccountModel.create({
    account_no,
    name,
    initial_balance,
    is_default,
    note,
  });

  SuccessResponse(res, { message: "Bank account created successfully", bankAccount });
};

// ✅ Get all (with total)
export const getBankAccounts = async (req: Request, res: Response) => {
  const accounts = await BankAccountModel.find();
  if (!accounts || accounts.length === 0) throw new NotFound("No bank accounts found");

  // ✅ total = sum of initial_balance
  const total = accounts.reduce((sum, acc) => sum + acc.initial_balance, 0);

  SuccessResponse(res, { message: "Get bank accounts successfully", accounts, total });
};

// ✅ Get by ID
export const getBankAccountById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Bank account ID is required");

  const account = await BankAccountModel.findById(id);
  if (!account) throw new NotFound("Bank account not found");

  SuccessResponse(res, { message: "Get bank account successfully", account });
};

// ✅ Update
export const updateBankAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Bank account ID is required");

  const { is_default } = req.body;

  // ✅ لو التحديث فيه is_default = true
  if (is_default) {
    await BankAccountModel.updateMany({}, { is_default: false });
  }

  const account = await BankAccountModel.findByIdAndUpdate(id, req.body, { new: true });
  if (!account) throw new NotFound("Bank account not found");

  SuccessResponse(res, { message: "Bank account updated successfully", account });
};

// ✅ Delete
export const deleteBankAccount = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Bank account ID is required");

  const account = await BankAccountModel.findByIdAndDelete(id);
  if (!account) throw new NotFound("Bank account not found");

  SuccessResponse(res, { message: "Bank account deleted successfully" });
};
