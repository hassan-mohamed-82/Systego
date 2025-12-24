"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getselectionExpenseAdmin = exports.getExpenseByIdAdmin = exports.getExpensesAdmin = exports.updateExpenseAdmin = exports.createExpenseAdmin = void 0;
const expenses_1 = require("../../models/schema/admin/POS/expenses");
const Errors_1 = require("../../Errors");
const expensecategory_1 = require("../../models/schema/admin/expensecategory");
const Financial_Account_1 = require("../../models/schema/admin/Financial_Account");
const response_1 = require("../../utils/response");
const createExpenseAdmin = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const { name, amount, Category_id, admin_id, note, financial_accountId } = req.body;
    if (!name || amount == null || !Category_id || !admin_id || !financial_accountId) {
        throw new Errors_1.BadRequest("Please provide all required fields");
    }
    if (amount <= 0) {
        throw new Errors_1.BadRequest("Amount must be greater than 0");
    }
    const category = await expensecategory_1.ExpenseCategoryModel.findById(Category_id);
    if (!category)
        throw new Errors_1.NotFound("Category not found");
    const updatedAccount = await Financial_Account_1.BankAccountModel.findOneAndUpdate({
        _id: financial_accountId,
        status: true,
        balance: { $gte: amount },
    }, { $inc: { balance: +amount } }, // هنا بيزود الفلوس
    { new: true });
    if (!updatedAccount) {
        throw new Errors_1.BadRequest("Insufficient balance in the selected account");
    }
    const expense = await expenses_1.ExpenseModel.create({
        name,
        amount,
        Category_id,
        admin_id,
        note,
        financial_accountId
    });
    (0, response_1.SuccessResponse)(res, { message: "Expense created successfully", expense });
};
exports.createExpenseAdmin = createExpenseAdmin;
const updateExpenseAdmin = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const { id } = req.params;
    if (!id)
        throw new Errors_1.BadRequest("Expense ID is required");
    const expense = await expenses_1.ExpenseModel.findOne({ _id: id });
    if (!expense)
        throw new Errors_1.NotFound("Expense not found");
    Object.assign(expense, req.body);
    await expense.save();
    (0, response_1.SuccessResponse)(res, { message: "Expense updated successfully", expense });
};
exports.updateExpenseAdmin = updateExpenseAdmin;
const getExpensesAdmin = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new Errors_1.BadRequest("User ID is required");
    const expenses = await expenses_1.ExpenseModel.find()
        .populate("admin_id", "username ")
        .populate("cashier_id", "name")
        .populate("shift_id", "start_time end_time")
        .populate("Category_id", "name ar_name")
        .populate("financial_accountId", "name ar_name");
    (0, response_1.SuccessResponse)(res, { message: "Expenses retrieved successfully", expenses });
};
exports.getExpensesAdmin = getExpensesAdmin;
const getExpenseByIdAdmin = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new Errors_1.BadRequest("User ID is required");
    const { id } = req.params;
    if (!id)
        throw new Errors_1.BadRequest("Expense ID is required");
    const expense = await expenses_1.ExpenseModel.findOne({ _id: id })
        .populate("admin_id", "username ")
        .populate("cashier_id", "name")
        .populate("shift_id", "start_time end_time")
        .populate("Category_id", "name ar_name")
        .populate("financial_accountId", "name ar_name");
    if (!expense)
        throw new Errors_1.NotFound("Expense not found");
    (0, response_1.SuccessResponse)(res, { message: "Expense retrieved successfully", expense });
};
exports.getExpenseByIdAdmin = getExpenseByIdAdmin;
const getselectionExpenseAdmin = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new Errors_1.BadRequest("User ID is required");
    const expensecategory = await expensecategory_1.ExpenseCategoryModel.find();
    const financial_account = await Financial_Account_1.BankAccountModel.find();
    (0, response_1.SuccessResponse)(res, { message: "ExpenseCategory retrieved successfully", expensecategory, financial_account });
};
exports.getselectionExpenseAdmin = getselectionExpenseAdmin;
