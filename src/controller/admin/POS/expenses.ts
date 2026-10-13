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

  // ✅ هات الشيفت المفتوح (اختياري الآن)
  const openShift = await CashierShift.findOne({
    cashierman_id: userId,
    status: "open",
  }).sort({ start_time: -1 });

  // ⭐️ التعديل: لا نرمي خطأ لو مفيش شيفت
  // بدلاً من:
  // if (!openShift) throw new BadRequest("You must open a cashier shift...");

  // نستخدمها فقط لو موجودة
  const shift_id = openShift?._id || null;

  // ✅ تأكيد الكاتجوري
  const category = await ExpenseCategoryModel.findById(Category_id);
  if (!category) throw new NotFound("Category not found");

  // ✅ خصم من الحساب المالي
  const updatedAccount = await BankAccountModel.findOneAndUpdate(
    {
      _id: financial_accountId,
      status: true,
      balance: { $gte: amount },
    },
    { $inc: { balance: -amount } },
    { new: true },
  );

  if (!updatedAccount) {
    throw new BadRequest(
      "Insufficient balance or financial account is invalid",
    );
  }

  // ✅ إنشاء الـ Expense (shift_id قد يكون null)
  const expense = await ExpenseModel.create({
    name,
    amount,
    Category_id,
    note,
    financial_accountId,
    shift_id, // ⭐️ قد يكون null
    cashier_id: userId,
  });

  SuccessResponse(res, {
    message: "Expense created successfully",
    expense,
    account_balance: updatedAccount.balance,
  });
};

export const updateExpense = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError("Unauthorized");

  const { id } = req.params;
  if (!id) throw new BadRequest("Expense ID is required");

  const expense = await ExpenseModel.findOne({ _id: id, cashier_id: userId });
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
  // Since expense subtracts from balance:
  // Increase in expense (new > old) -> Decrease in balance (difference negative)
  // Decrease in expense (new < old) -> Increase in balance (difference positive)
  // Formula: oldAmount - newAmount
  const balanceDifference = oldAmount - newAmount;

  const updatedAccount = await BankAccountModel.findOneAndUpdate(
    {
      _id: expense.financial_accountId,
      status: true,
      in_POS: true,
    },
    { $inc: { balance: balanceDifference } },
    { new: true },
  );

  if (!updatedAccount) {
    throw new BadRequest(
      "Financial account not found or is not allowed in POS",
    );
  }

  // Check if balance went negative after the update
  if (updatedAccount.balance < 0) {
    // Rollback the balance change
    await BankAccountModel.findByIdAndUpdate(expense.financial_accountId, {
      $inc: { balance: -balanceDifference },
    });
    throw new BadRequest("Insufficient balance in financial account");
  }

  Object.assign(expense, req.body);
  await expense.save();

  SuccessResponse(res, {
    message: "Expense updated successfully",
    expense,
    account_balance: updatedAccount.balance,
  });
};

export const getExpenses = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new BadRequest("User ID is required");

  // 👇 غير cashier_id لـ cashierman_id عشان يطابق الشيفت
  const openShift = await CashierShift.findOne({
    cashierman_id: userId, // 👈 صححها
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
  const categories = await ExpenseCategoryModel.find({ status: true });
  const accounts = await BankAccountModel.find({ in_POS: true, status: true });

  SuccessResponse(res, {
    message: "Selection data retrieved successfully",
    categories,
    accounts,
  });
};

export const getExpenseById = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new BadRequest("User ID is required");

  const { id } = req.params;
  if (!id) throw new BadRequest("Expense ID is required");

  const expense = await ExpenseModel.findOne({ _id: id, cashier_id: userId })
    .populate("Category_id", "name ar_name")
    .populate("financial_accountId", "name ar_name");
  if (!expense) throw new NotFound("Expense not found");

  SuccessResponse(res, { message: "Expense retrieved successfully", expense });
};

export const deleteExpense = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError("Unauthorized");

  const { id } = req.params;
  if (!id) throw new BadRequest("Expense ID is required");

  // ✅ 1) هات المصروف
  const expense = await ExpenseModel.findById(id);
  if (!expense) throw new NotFound("Expense not found");

  // ✅ 2) رجّع المبلغ للحساب المالي (عكس عملية الإنشاء)
  const updatedAccount = await BankAccountModel.findOneAndUpdate(
    { _id: expense.financial_accountId },
    { $inc: { balance: +expense.amount } }, // ⭐️ رجّع الفلوس
    { new: true },
  );

  if (!updatedAccount) {
    throw new BadRequest("Financial account not found");
  }

  // ✅ 3) احذف المصروف
  await ExpenseModel.findByIdAndDelete(id);

  SuccessResponse(res, {
    message: "Expense deleted successfully",
    account_balance: updatedAccount.balance,
  });
};
