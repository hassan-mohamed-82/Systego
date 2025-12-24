import { Request, Response } from "express";
import { BadRequest } from "../../Errors/BadRequest";
import { UnauthorizedError } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { BankAccountModel } from "../../models/schema/admin/Financial_Account";
import { CashierShift } from "../../models/schema/admin/POS/CashierShift";
import { RevenueModel } from "../../models/schema/admin/Revenue";
import { ExpenseCategoryModel } from "../../models/schema/admin/expensecategory";
import { NotFound } from "../../Errors/NotFound";

export const createRevenue = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Unauthorized");
    const { name, amount, Category_id, note, financial_accountId } = req.body;
    if (!name || amount == null || !Category_id || !financial_accountId) {
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
        { $inc: { balance: +amount } }, // هنا بيزود الفلوس
        { new: true }
    );

    if (!updatedAccount) {
        throw new BadRequest("Insufficient balance in the selected account");
    }

    const revenue = await RevenueModel.create({
        name,
        amount,
        Category_id,
        note,
        financial_accountId,
        admin_id: userId,
    });

    SuccessResponse(res, {
        message: "Revenue created successfully",
        revenue,
        account_balance: updatedAccount.balance,
    });
};

export const updateRevenue = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Unauthorized");

    const { id } = req.params;
    if (!id) throw new BadRequest("Revenue ID is required");

    const revenue = await RevenueModel.findOne({ _id: id });
    if (!revenue) throw new NotFound("Revenue not found");
    const newAmount = req.body.amount;

    // If no amount change, just update other fields
    if (newAmount == null) {
        Object.assign(revenue, req.body);
        await revenue.save();
        SuccessResponse(res, { message: "Revenue updated successfully", revenue });
        return;
    }

    // Validate the new amount
    if (newAmount <= 0) {
        throw new BadRequest("Amount must be greater than 0");
    }

    // Get the old amount from the existing revenue
    const oldAmount = revenue.amount;

    // Calculate the difference: subtract old amount, add new amount
    // If oldAmount = 100 and newAmount = 150, difference = +50 (add 50 to balance)
    // If oldAmount = 100 and newAmount = 50, difference = -50 (subtract 50 from balance)
    const balanceDifference = newAmount - oldAmount;

    // Update the account balance with the difference
    const updatedAccount = await BankAccountModel.findOneAndUpdate(
        {
            _id: revenue.financial_accountId,
            status: true,
        },
        { $inc: { balance: balanceDifference } }, // هنا بنعدل الفرق بين القديم والجديد
        { new: true }
    );

    if (!updatedAccount) {
        throw new BadRequest("Financial account not found or is not allowed");
    }

    // Check if balance went negative after the update
    if (updatedAccount.balance < 0) {
        // Rollback the balance change
        await BankAccountModel.findByIdAndUpdate(
            revenue.financial_accountId,
            { $inc: { balance: -balanceDifference } }
        );
        throw new BadRequest("Insufficient balance in financial account");
    }

    Object.assign(revenue, req.body);
    await revenue.save();
    SuccessResponse(res, {
        message: "Revenue updated successfully",
        revenue,
        account_balance: updatedAccount.balance
    });

};

export const getRevenues = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new BadRequest("Unauthorized Token");

    const revenues = await RevenueModel.find()
        .populate("admin_id", "username ")
        .populate("Category_id", "name ar_name")
        .populate("financial_accountId", "name ar_name");

    SuccessResponse(res, { message: "Revenues retrieved successfully", revenues });
};

export const selectionRevenue = async (req: Request, res: Response) => {
    const categories = await ExpenseCategoryModel.find({ status: true });
    const accounts = await BankAccountModel.find({ status: true });

    SuccessResponse(res, { message: "Selection data retrieved successfully", categories, accounts });
};

export const getRevenueById = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new BadRequest("Unauthorized Token");

    const { id } = req.params;
    if (!id) throw new BadRequest("Revenue ID is required");

    const revenue = await RevenueModel.findOne({ _id: id})
        .populate("admin_id", "username ")
        .populate("Category_id", "name ar_name")
        .populate("financial_accountId", "name ar_name");

    if (!revenue) throw new NotFound("Revenue not found");

    SuccessResponse(res, { message: "Revenue retrieved successfully", revenue });
};



