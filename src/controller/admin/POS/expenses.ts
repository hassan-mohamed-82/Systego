import { Request, Response } from "express";
import { ExpenseModel } from "../../../models/schema/admin/POS/expenses";
import { BadRequest } from "../../../Errors/BadRequest";
import { NotFound, UnauthorizedError } from "../../../Errors";
import { SuccessResponse } from "../../../utils/response";
import { CategoryModel } from "../../../models/schema/admin/category";
import { BankAccountModel } from "../../../models/schema/admin/Financial_Account";
import { CashierShift } from "../../../models/schema/admin/POS/CashierShift";
import { ExpenseCategoryModel } from "../../../models/schema/admin/expensecategory";


export const createExpense = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError("Unauthorized");

  const { name, amount, Category_id, note, financial_accountId } = req.body;

  if (!name || amount == null || !Category_id || !financial_accountId) {
    throw new BadRequest("Please provide all required fields");
  }
  if (amount <= 0) {
    throw new BadRequest("Amount must be greater than 0");
  }

  // ✅ 1) هات الشيفت المفتوح للكاشير ده
  const openShift = await CashierShift.findOne({
    cashierman_id: userId,
    status: "open",
  }).sort({ start_time: -1 });

  if (!openShift) {
    throw new BadRequest(
      "You must open a cashier shift before creating an expense"
    );
  }

  // ✅ 2) تأكيد الكاتجوري
  const category = await ExpenseCategoryModel.findById(Category_id);
  if (!category) throw new NotFound("Category not found");

  // ✅ 3) حاول تخصم من الحساب المالي لو الـ balance يكفي
  // نستخدم findOneAndUpdate بشرط balance >= amount
  const updatedAccount = await BankAccountModel.findOneAndUpdate(
    {
      _id: financial_accountId,
      status: true,
      in_POS: true,
      balance: { $gte: amount },          // 👈 لازم يكون الرصيد كافي
    },
    { $inc: { balance: -amount } },       // 👈 خصم المبلغ
    { new: true }
  );

  if (!updatedAccount) {
    // يا إما الحساب مش لاقيه / مش active / مش in_POS / أو الرصيد مش كافي
    throw new BadRequest(
      "Insufficient balance or financial account is not allowed in POS"
    );
  }

  // ✅ 4) إنشاء الـ Expense مربوط فعلياً بالشيفت المفتوح
  const expense = await ExpenseModel.create({
    name,
    amount,
    Category_id,
    note,
    financial_accountId,
    shift_id: openShift._id,
    cashier_id: userId,
  });

  SuccessResponse(res, {
    message: "Expense created successfully",
    expense,
    account_balance: updatedAccount.balance, // لو حابب تشوف الرصيد بعد الخصم
  });
};


export const updateExpense = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError("Unauthorized");
  const { id } = req.params;
  if (!id) throw new BadRequest("Expense ID is required");
  const expense = await ExpenseModel.findOne({ _id: id, cashier_id: userId });
  if (!expense) throw new NotFound("Expense not found");

  Object.assign(expense, req.body);
  await expense.save();
  SuccessResponse(res, { message: "Expense updated successfully", expense });
};

export const getExpenses = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new BadRequest("User ID is required");

  // 👇 غير cashier_id لـ cashierman_id عشان يطابق الشيفت
  const openShift = await CashierShift.findOne({
    cashierman_id: userId,  // 👈 صححها
    status: "open",
  }).sort({ start_time: -1 });

  if (!openShift) {
    return SuccessResponse(res, {
      message: "No open shift for this cashier",
      expenses: [],
    });
  }

  const expenses = await ExpenseModel.find({
    cashier_id: userId,
    shift_id: openShift._id,
  })
    .populate("Category_id", "name ar_name")
    .populate("financial_accountId", "name ar_name");

  SuccessResponse(res, {
    message: "Expenses retrieved successfully",
    expenses,
  });
};


export const selectionExpense = async (req: Request, res: Response) => {
 const categories = await ExpenseCategoryModel.find({status: true});
 const accounts = await BankAccountModel.find({ in_POS: true , status: true});

 SuccessResponse(res, { message: "Selection data retrieved successfully", categories, accounts });
}


export const getExpenseById = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new BadRequest("User ID is required");

  const { id } = req.params;
  if (!id) throw new BadRequest("Expense ID is required");

  const expense = await ExpenseModel.findOne({ _id: id, cashier_id: userId }).populate("Category_id", "name ar_name").populate("financial_accountId", "name ar_name");
  if (!expense) throw new NotFound("Expense not found");

  SuccessResponse(res, { message: "Expense retrieved successfully", expense });
};
