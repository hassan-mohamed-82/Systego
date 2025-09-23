import { Request, Response } from "express";
import { ExpenseModel } from "../models/schema/expenses";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound } from "../Errors";
import { SuccessResponse } from "../utils/response";
import { WarehouseModel } from "../models/schema/Warehouse";
import { ExpenseCategoryModel } from "../models/schema/ExpenseCategory";

export const createExpense = async (req: Request, res: Response) => {
  const { date, reference, warehouse_id, expense_category_id, amount, note } = req.body;
  if (!date || !reference || !warehouse_id || !expense_category_id || !amount) {
    throw new BadRequest("Please provide all required fields");
  }
const warehouse = await WarehouseModel.findById(warehouse_id);
if (!warehouse) throw new BadRequest("Invalid warehouse ID");

const expenseCategory = await ExpenseCategoryModel.findById(expense_category_id);
if (!expenseCategory) throw new BadRequest("Invalid expense category ID");

  const expense = await ExpenseModel.create({
    date,
    reference,
    warehouse_id,
    expense_category_id,
    amount,
    note,
  });
  SuccessResponse(res, { message: "Expense created successfully", expense });
};

export const getExpenses = async (req: Request, res: Response) => {
  const expenses = await ExpenseModel.find().populate("warehouse_id","name address").populate("expense_category_id");
  if (!expenses || expenses.length === 0) throw new NotFound("No expenses found");
  SuccessResponse(res, { message: "Get expenses successfully", expenses });
};

export const getExpenseById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Expense ID is required");
  const expense = await ExpenseModel.findById(id).populate("warehouse_id","name address").populate("expense_category_id");
  if (!expense) throw new NotFound("Expense not found");
  SuccessResponse(res, { message: "Get expense successfully", expense });
};

export const deleteExpense = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Expense ID is required");
  const expense = await ExpenseModel.findByIdAndDelete(id);
  if (!expense) throw new NotFound("Expense not found");
  SuccessResponse(res, { message: "Expense deleted successfully" });
};

export const updateExpense = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Expense ID is required");
  const expense = await ExpenseModel.findByIdAndUpdate(id, req.body, { new: true });
  if (!expense) throw new NotFound("Expense not found");
  SuccessResponse(res, { message: "Expense updated successfully", expense });
};
