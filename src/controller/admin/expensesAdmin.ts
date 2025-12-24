import { Request, Response } from "express";
import { ExpenseModel } from "../../models/schema/admin/POS/expenses";
import { UnauthorizedError } from "../../Errors";

export const createExpenseAdmin = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Unauthorized");

    const { name, amount, Category_id, admin_id, note, financial_accountId } = req.body;

}

export const updateExpenseAdmin = async (req: Request, res: Response) => {

}

export const getExpensesAdmin = async (req: Request, res: Response) => {

}

export const getExpenseByIdAdmin = async (req: Request, res: Response) => {

}
