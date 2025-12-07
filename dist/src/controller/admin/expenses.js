"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpenseById = exports.getExpenses = exports.updateExpense = exports.createExpense = void 0;
const expenses_1 = require("../../models/schema/admin/expenses");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const createExpense = async (req, res) => {
    const { name, amount, Category_id, note, financial_accountId } = req.body;
    const expense = new expenses_1.ExpenseModel({
        name,
        amount,
        Category_id,
        note,
        financial_accountId,
    });
    await expense.save();
    (0, response_1.SuccessResponse)(res, { message: "Expense created successfully", expense });
};
exports.createExpense = createExpense;
const updateExpense = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Expense ID is required");
    const expense = await expenses_1.ExpenseModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!expense)
        throw new Errors_1.NotFound("Expense not found");
    (0, response_1.SuccessResponse)(res, { message: "Expense updated successfully", expense });
};
exports.updateExpense = updateExpense;
const getExpenses = async (req, res) => {
    const expenses = await expenses_1.ExpenseModel.find()
        .populate("Category_id", "name")
        .populate("financial_accountId", "name ar_name");
    (0, response_1.SuccessResponse)(res, { message: "Expenses retrieved successfully", expenses });
};
exports.getExpenses = getExpenses;
const getExpenseById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Expense ID is required");
    const expense = await expenses_1.ExpenseModel.findById(id)
        .populate("Category_id", "name")
        .populate("financial_accountId", "name ar_name");
    if (!expense)
        throw new Errors_1.NotFound("Expense not found");
    (0, response_1.SuccessResponse)(res, { message: "Expense retrieved successfully", expense });
};
exports.getExpenseById = getExpenseById;
