import { Request, Response } from "express";
import { ExpenseModel } from "../../models/schema/admin/POS/expenses";
import { BadRequest, NotFound, UnauthorizedError } from "../../Errors";
import { ExpenseCategoryModel } from "../../models/schema/admin/expensecategory";
import { BankAccountModel } from "../../models/schema/admin/Financial_Account";
import { SuccessResponse } from "../../utils/response";

export const createExpenseAdmin = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Unauthorized");

    const { name, amount, Category_id, admin_id, note, financial_accountId } = req.body;

    if (!name || amount == null || !Category_id || !admin_id || !financial_accountId) {
        throw new BadRequest("Please provide all required fields");
    }
    if (amount <= 0) {
        throw new BadRequest("Amount must be greater than 0");
    }

    const category = await ExpenseCategoryModel.findById(Category_id);
    if (!category) throw new NotFound("Category not found");

    const updatedAccount = await BankAccountModel.findOneAndUpdate(
        {
            _id: financial_accountId,
            status: true,
            balance: { $gte: amount },
        },
        { $inc: { balance: -amount } }, // هنا بيقلل الفلوس
        { new: true }
    );

    if (!updatedAccount) {
        throw new BadRequest("Insufficient balance in the selected account");
    }

    const expense = await ExpenseModel.create({
        name,
        amount,
        Category_id,
        admin_id,
        note,
        financial_accountId
    })

    SuccessResponse(res, { message: "Expense created successfully", expense });

}

export const updateExpenseAdmin = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Unauthorized");

    const { id } = req.params;
    if (!id) throw new BadRequest("Expense ID is required");

    const expense = await ExpenseModel.findOne({ _id: id });
    if (!expense) throw new NotFound("Expense not found");

    const newAmount = req.body.amount;

    // If no amount change, just update other fields
    if (newAmount == null) {
        Object.assign(expense, req.body);
        await expense.save();
        SuccessResponse(res, { message: "Expense updated successfully", expense });
        return;
    }

    if (newAmount <= 0) {
        throw new BadRequest("Amount must be greater than 0");
    }

    const oldAmount = expense.amount;

    // Calculate the difference for the bank balance
    // Expense subtracts from balance:
    // Increase in expense (new > old) -> Decrease in balance (difference negative)
    // Decrease in expense (new < old) -> Increase in balance (difference positive)
    // Formula: oldAmount - newAmount
    const balanceDifference = oldAmount - newAmount;

    const updatedAccount = await BankAccountModel.findOneAndUpdate(
        {
            _id: expense.financial_accountId,
            status: true,
        },
        { $inc: { balance: balanceDifference } },
        { new: true }
    );

    if (!updatedAccount) {
        throw new BadRequest("Financial account not found or inactive");
    }

    // Check if balance went negative after the update
    if (updatedAccount.balance < 0) {
        // Rollback the balance change
        await BankAccountModel.findByIdAndUpdate(
            expense.financial_accountId,
            { $inc: { balance: -balanceDifference } }
        );
        throw new BadRequest("Insufficient balance in financial account");
    }

    Object.assign(expense, req.body);
    await expense.save();
    SuccessResponse(res, {
        message: "Expense updated successfully",
        expense,
        account_balance: updatedAccount.balance
    });

}

export const getExpensesAdmin = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new BadRequest("User ID is required");

    const expenses = await ExpenseModel.find()
        .populate("admin_id", "username ")
        .populate("cashier_id", "name")
        .populate("shift_id", "start_time end_time")
        .populate("Category_id", "name ar_name")
        .populate("financial_accountId", "name ar_name");
    SuccessResponse(res, { message: "Expenses retrieved successfully", expenses });

}

export const getExpenseByIdAdmin = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new BadRequest("User ID is required");
    const { id } = req.params;
    if (!id) throw new BadRequest("Expense ID is required");
    const expense = await ExpenseModel.findOne({ _id: id })
        .populate("admin_id", "username ")
        .populate("cashier_id", "name")
        .populate("shift_id", "start_time end_time")
        .populate("Category_id", "name ar_name")
        .populate("financial_accountId", "name ar_name");
    if (!expense) throw new NotFound("Expense not found");
    SuccessResponse(res, { message: "Expense retrieved successfully", expense });

}


export const getselectionExpenseAdmin = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new BadRequest("User ID is required");
    const expensecategory = await ExpenseCategoryModel.find();
    const financial_account = await BankAccountModel.find({  status: true });
    SuccessResponse(res, { message: "ExpenseCategory retrieved successfully", expensecategory, financial_account });
}
