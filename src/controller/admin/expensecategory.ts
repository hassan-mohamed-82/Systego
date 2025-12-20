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
    const { status } = req.query;
    
    const filter: any = {};
    if (status !== undefined) {
        // Handle case where status might be an array (e.g., ?status=true&status=false)
        const statusValue = Array.isArray(status) ? status[0] : status;
        filter.status = statusValue === 'true';
    } else {
        // Default to only returning active categories (original behavior)
        filter.status = true;
    }
    
    const expenseCategories = await ExpenseCategoryModel.find(filter);
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
