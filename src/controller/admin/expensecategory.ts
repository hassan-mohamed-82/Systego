import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { ExpenseCategoryModel } from "../../models/schema/admin/expensecategory";

export const createExpenseCategory = async (req: Request, res: Response) => {
  const { name, ar_name,status } = req.body;
    if (!name || !ar_name) {
        throw new BadRequest(" name and ar_name  are required");
    }
    const existingExpenseCategory = await ExpenseCategoryModel.findOne({ name });
    if (existingExpenseCategory) throw new BadRequest("ExpenseCategory already exists");
    const expenseCategory = await ExpenseCategoryModel.create({ name, ar_name,status });
    SuccessResponse(res, { message: "ExpenseCategory created successfully", expenseCategory });
};


export const getExpenseCategories = async (req: Request, res: Response) => {
    const expenseCategories = await ExpenseCategoryModel.find();
    SuccessResponse(res, { expenseCategories });
}


export const updateExpenseCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, ar_name, status } = req.body;
    
    const expenseCategory = await ExpenseCategoryModel.findById(id);
    if (!expenseCategory) throw new NotFound("ExpenseCategory not found");
    
    if (name !== undefined) expenseCategory.name = name;
    if (ar_name !== undefined) expenseCategory.ar_name = ar_name;
    if (status !== undefined) expenseCategory.status = status;  // 👈 كده صح
    
    await expenseCategory.save();
    SuccessResponse(res, { message: "ExpenseCategory updated successfully", expenseCategory });
}

export const getExpenseCategoryById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const expenseCategory = await ExpenseCategoryModel.findById(id);
    if (!expenseCategory) throw new NotFound("ExpenseCategory not found");
    SuccessResponse(res, {message: "ExpenseCategory found successfully", expenseCategory });
}


export const deleteExpenseCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const expenseCategory = await ExpenseCategoryModel.findById(id);
    if (!expenseCategory) throw new NotFound("ExpenseCategory not found");
    await ExpenseCategoryModel.findByIdAndDelete(id);
    SuccessResponse(res, { message: "ExpenseCategory deleted successfully" });
}
