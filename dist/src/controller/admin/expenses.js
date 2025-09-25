"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateExpense = exports.deleteExpense = exports.getExpenseById = exports.getExpenses = exports.createExpense = void 0;
const expenses_1 = require("../../models/schema/admin/expenses");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const ExpenseCategory_1 = require("../../models/schema/admin/ExpenseCategory");
const createExpense = async (req, res) => {
    const { date, reference, warehouse_id, expense_category_id, amount, note } = req.body;
    if (!date || !reference || !warehouse_id || !expense_category_id || !amount) {
        throw new BadRequest_1.BadRequest("Please provide all required fields");
    }
    const warehouse = await Warehouse_1.WarehouseModel.findById(warehouse_id);
    if (!warehouse)
        throw new BadRequest_1.BadRequest("Invalid warehouse ID");
    const expenseCategory = await ExpenseCategory_1.ExpenseCategoryModel.findById(expense_category_id);
    if (!expenseCategory)
        throw new BadRequest_1.BadRequest("Invalid expense category ID");
    const expense = await expenses_1.ExpenseModel.create({
        date,
        reference,
        warehouse_id,
        expense_category_id,
        amount,
        note,
    });
    (0, response_1.SuccessResponse)(res, { message: "Expense created successfully", expense });
};
exports.createExpense = createExpense;
const getExpenses = async (req, res) => {
    const expenses = await expenses_1.ExpenseModel.find().populate("warehouse_id", "name address").populate("expense_category_id");
    if (!expenses || expenses.length === 0)
        throw new Errors_1.NotFound("No expenses found");
    (0, response_1.SuccessResponse)(res, { message: "Get expenses successfully", expenses });
};
exports.getExpenses = getExpenses;
const getExpenseById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Expense ID is required");
    const expense = await expenses_1.ExpenseModel.findById(id).populate("warehouse_id", "name address").populate("expense_category_id");
    if (!expense)
        throw new Errors_1.NotFound("Expense not found");
    (0, response_1.SuccessResponse)(res, { message: "Get expense successfully", expense });
};
exports.getExpenseById = getExpenseById;
const deleteExpense = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Expense ID is required");
    const expense = await expenses_1.ExpenseModel.findByIdAndDelete(id);
    if (!expense)
        throw new Errors_1.NotFound("Expense not found");
    (0, response_1.SuccessResponse)(res, { message: "Expense deleted successfully" });
};
exports.deleteExpense = deleteExpense;
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
