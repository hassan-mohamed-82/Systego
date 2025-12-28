import { CashierModel } from "../../models/schema/admin/cashier";
import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";
import { NotFound, BadRequest } from "../../Errors";
import { BankAccountModel } from "../../models/schema/admin/Financial_Account";

export const createCashier = async (req: Request, res: Response) => {
  const { name, ar_name, warehouse_id, status, bankAccounts } = req.body;

  if (!name || !ar_name || !warehouse_id) {
    throw new BadRequest("name, ar_name and warehouse_id are required");
  }

  const existingCashier = await CashierModel.findOne({ name, warehouse_id });
  if (existingCashier) {
    throw new BadRequest("Cashier already exists in this warehouse");
  }

  const cashier = await CashierModel.create({
    name,
    ar_name,
    warehouse_id,
    status,
    bankAccounts: bankAccounts || [],
  });

  SuccessResponse(res, { message: "Cashier created successfully", cashier });
};

export const deleteCashier = async (req: Request, res: Response) => {
  const { id } = req.params;
  const cashier = await CashierModel.findByIdAndDelete(id);
  if (!cashier) throw new NotFound("Cashier not found");
  SuccessResponse(res, { message: "Cashier deleted successfully" });
};

export const getCashiers = async (req: Request, res: Response) => {
  const cashiers = await CashierModel.find()
    .populate("warehouse_id", "name")
    .populate("bankAccounts", "name balance status in_POS")
    .populate("warehouseUsers", "username email role status"); // الـ virtual

  SuccessResponse(res, {
    message: "Cashiers fetched successfully",
    cashiers,
  });
};

export const getCashierById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const cashier = await CashierModel.findById(id)
    .populate("warehouse_id", "name")
    .populate("bankAccounts", "name balance status in_POS")
    .populate("warehouseUsers", "username email role status");

  if (!cashier) throw new NotFound("Cashier not found");

  SuccessResponse(res, { cashier });
};

export const updateCashier = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    ar_name,
    warehouse_id,
    status,
    bankAccounts,
    addBankAccount,
    removeBankAccount,
  } = req.body;

  const updateQuery: any = {};
  const setFields: any = {};

  // الحقول العادية
  if (name !== undefined) setFields.name = name;
  if (ar_name !== undefined) setFields.ar_name = ar_name;
  if (warehouse_id !== undefined) setFields.warehouse_id = warehouse_id;
  if (status !== undefined) setFields.status = status;

  // استبدال كل الـ bankAccounts
  if (bankAccounts !== undefined) setFields.bankAccounts = bankAccounts;

  // بناء الـ query
  if (Object.keys(setFields).length > 0) updateQuery.$set = setFields;
  if (addBankAccount) updateQuery.$addToSet = { bankAccounts: addBankAccount };
  if (removeBankAccount) updateQuery.$pull = { bankAccounts: removeBankAccount };

  if (Object.keys(updateQuery).length === 0) {
    throw new BadRequest("No valid fields to update");
  }

  const cashier = await CashierModel.findByIdAndUpdate(id, updateQuery, {
    new: true,
    runValidators: true,
  })
    .populate("warehouse_id", "name")
    .populate("bankAccounts", "name balance");

  if (!cashier) throw new NotFound("Cashier not found");

  SuccessResponse(res, { message: "Cashier updated successfully", cashier });
};

// جلب كل الـ Bank Accounts (للاختيار منها)
export const getBankAccounts = async (req: Request, res: Response) => {
  const bankAccounts = await BankAccountModel.find({ status: true, in_POS: true }).select(
    "name balance status in_POS"
  );
  SuccessResponse(res, {
    message: "Bank accounts fetched successfully",
    bankAccounts,
  });
};
