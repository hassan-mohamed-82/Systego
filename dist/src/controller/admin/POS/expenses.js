"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpenseById = exports.selectionExpense = exports.getExpenses = exports.updateExpense = exports.createExpense = void 0;
const expenses_1 = require("../../../models/schema/admin/POS/expenses");
const BadRequest_1 = require("../../../Errors/BadRequest");
const Errors_1 = require("../../../Errors");
const response_1 = require("../../../utils/response");
const Financial_Account_1 = require("../../../models/schema/admin/Financial_Account");
const CashierShift_1 = require("../../../models/schema/admin/POS/CashierShift");
const expensecategory_1 = require("../../../models/schema/admin/expensecategory");
const createExpense = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const { name, amount, Category_id, note, financial_accountId } = req.body;
    if (!name || amount == null || !Category_id || !financial_accountId) {
        throw new BadRequest_1.BadRequest("Please provide all required fields");
    }
    if (amount <= 0) {
        throw new BadRequest_1.BadRequest("Amount must be greater than 0");
    }
    // ✅ 1) هات الشيفت المفتوح للكاشير ده
    const openShift = await CashierShift_1.CashierShift.findOne({
        cashierman_id: userId,
        status: "open",
    }).sort({ start_time: -1 });
    if (!openShift) {
        throw new BadRequest_1.BadRequest("You must open a cashier shift before creating an expense");
    }
    // ✅ 2) تأكيد الكاتجوري
    const category = await expensecategory_1.ExpenseCategoryModel.findById(Category_id);
    if (!category)
        throw new Errors_1.NotFound("Category not found");
    // ✅ 3) حاول تخصم من الحساب المالي لو الـ balance يكفي
    // نستخدم findOneAndUpdate بشرط balance >= amount
    const updatedAccount = await Financial_Account_1.BankAccountModel.findOneAndUpdate({
        _id: financial_accountId,
        status: true,
        in_POS: true,
        balance: { $gte: amount }, // 👈 لازم يكون الرصيد كافي
    }, { $inc: { balance: -amount } }, // 👈 خصم المبلغ
    { new: true });
    if (!updatedAccount) {
        // يا إما الحساب مش لاقيه / مش active / مش in_POS / أو الرصيد مش كافي
        throw new BadRequest_1.BadRequest("Insufficient balance or financial account is not allowed in POS");
    }
    // ✅ 4) إنشاء الـ Expense مربوط فعلياً بالشيفت المفتوح
    const expense = await expenses_1.ExpenseModel.create({
        name,
        amount,
        Category_id,
        note,
        financial_accountId,
        shift_id: openShift._id,
        cashier_id: userId,
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Expense created successfully",
        expense,
        account_balance: updatedAccount.balance, // لو حابب تشوف الرصيد بعد الخصم
    });
};
exports.createExpense = createExpense;
const updateExpense = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Expense ID is required");
    const expense = await expenses_1.ExpenseModel.findOne({ _id: id, cashier_id: userId });
    if (!expense)
        throw new Errors_1.NotFound("Expense not found");
    const newAmount = req.body.amount;
    // If no amount change, just update other fields
    if (newAmount == null) {
        Object.assign(expense, req.body);
        await expense.save();
        (0, response_1.SuccessResponse)(res, { message: "Expense updated successfully", expense });
        return;
    }
    if (newAmount <= 0) {
        throw new BadRequest_1.BadRequest("Amount must be greater than 0");
    }
    const oldAmount = expense.amount;
    // Calculate the difference for the bank balance
    // Since expense subtracts from balance:
    // Increase in expense (new > old) -> Decrease in balance (difference negative)
    // Decrease in expense (new < old) -> Increase in balance (difference positive)
    // Formula: oldAmount - newAmount
    const balanceDifference = oldAmount - newAmount;
    const updatedAccount = await Financial_Account_1.BankAccountModel.findOneAndUpdate({
        _id: expense.financial_accountId,
        status: true,
        in_POS: true,
    }, { $inc: { balance: balanceDifference } }, { new: true });
    if (!updatedAccount) {
        throw new BadRequest_1.BadRequest("Financial account not found or is not allowed in POS");
    }
    // Check if balance went negative after the update
    if (updatedAccount.balance < 0) {
        // Rollback the balance change
        await Financial_Account_1.BankAccountModel.findByIdAndUpdate(expense.financial_accountId, { $inc: { balance: -balanceDifference } });
        throw new BadRequest_1.BadRequest("Insufficient balance in financial account");
    }
    Object.assign(expense, req.body);
    await expense.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Expense updated successfully",
        expense,
        account_balance: updatedAccount.balance,
    });
};
exports.updateExpense = updateExpense;
const getExpenses = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new BadRequest_1.BadRequest("User ID is required");
    // 👇 غير cashier_id لـ cashierman_id عشان يطابق الشيفت
    const openShift = await CashierShift_1.CashierShift.findOne({
        cashierman_id: userId, // 👈 صححها
        status: "open",
    }).sort({ start_time: -1 });
    if (!openShift) {
        return (0, response_1.SuccessResponse)(res, {
            message: "No open shift for this cashier",
            expenses: [],
        });
    }
    const expenses = await expenses_1.ExpenseModel.find({
        cashier_id: userId,
        shift_id: openShift._id,
    })
        .populate("Category_id", "name ar_name")
        .populate("financial_accountId", "name ar_name");
    (0, response_1.SuccessResponse)(res, {
        message: "Expenses retrieved successfully",
        expenses,
    });
};
exports.getExpenses = getExpenses;
const selectionExpense = async (req, res) => {
    const categories = await expensecategory_1.ExpenseCategoryModel.find({ status: true });
    const accounts = await Financial_Account_1.BankAccountModel.find({ in_POS: true, status: true });
    (0, response_1.SuccessResponse)(res, { message: "Selection data retrieved successfully", categories, accounts });
};
exports.selectionExpense = selectionExpense;
const getExpenseById = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new BadRequest_1.BadRequest("User ID is required");
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Expense ID is required");
    const expense = await expenses_1.ExpenseModel.findOne({ _id: id, cashier_id: userId }).populate("Category_id", "name ar_name").populate("financial_accountId", "name ar_name");
    if (!expense)
        throw new Errors_1.NotFound("Expense not found");
    (0, response_1.SuccessResponse)(res, { message: "Expense retrieved successfully", expense });
};
exports.getExpenseById = getExpenseById;
