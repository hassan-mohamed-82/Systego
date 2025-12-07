import { Request, Response } from "express";
import { ExpenseModel } from "../../models/schema/admin/expenses";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const createExpense = async (req: Request, res: Response) => {
  const { name, amount, Category_id, note, financial_accountId } = req.body;
  const expense = new ExpenseModel({
    name,
    amount,
    Category_id,
    note,
    financial_accountId,
  });
  await expense.save();
  SuccessResponse(res, { message: "Expense created successfully", expense });
};

export const updateExpense = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Expense ID is required");
  const expense = await ExpenseModel.findByIdAndUpdate(id, req.body, { new: true });
  if (!expense) throw new NotFound("Expense not found");
  SuccessResponse(res, { message: "Expense updated successfully", expense });
};

export const getExpenses = async (req: Request, res: Response) => {
  const expenses = await ExpenseModel.find()
    .populate("Category_id", "name")
    .populate("financial_accountId", "name ar_name");
  
  SuccessResponse(res, { message: "Expenses retrieved successfully", expenses });
}

export const getExpenseById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Expense ID is required");

  const expense = await ExpenseModel.findById(id)
    .populate("Category_id", "name")
    .populate("financial_accountId", "name ar_name");

  if (!expense) throw new NotFound("Expense not found");

  SuccessResponse(res, { message: "Expense retrieved successfully", expense });
}
