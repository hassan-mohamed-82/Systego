"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteExpenseCategory = exports.getExpenseCategoryById = exports.updateExpenseCategory = exports.getExpenseCategories = exports.createExpenseCategory = void 0;
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const expensecategory_1 = require("../../models/schema/admin/expensecategory");
const createExpenseCategory = async (req, res) => {
    const { name, ar_name, status } = req.body;
    if (!name || !ar_name) {
        throw new BadRequest_1.BadRequest(" name and ar_name  are required");
    }
    const existingExpenseCategory = await expensecategory_1.ExpenseCategoryModel.findOne({ name });
    if (existingExpenseCategory)
        throw new BadRequest_1.BadRequest("ExpenseCategory already exists");
    const expenseCategory = await expensecategory_1.ExpenseCategoryModel.create({ name, ar_name, status });
    (0, response_1.SuccessResponse)(res, { message: "ExpenseCategory created successfully", expenseCategory });
};
exports.createExpenseCategory = createExpenseCategory;
const getExpenseCategories = async (req, res) => {
    const expenseCategories = await expensecategory_1.ExpenseCategoryModel.find({ status: true });
    (0, response_1.SuccessResponse)(res, { expenseCategories });
};
exports.getExpenseCategories = getExpenseCategories;
const updateExpenseCategory = async (req, res) => {
    const { id } = req.params;
    const { name, ar_name, status } = req.body;
    const expenseCategory = await expensecategory_1.ExpenseCategoryModel.findById(id);
    if (!expenseCategory)
        throw new Errors_1.NotFound("ExpenseCategory not found");
    if (name)
        expenseCategory.name = name;
    if (ar_name)
        expenseCategory.ar_name = ar_name;
    if (status)
        expenseCategory.status = status;
    await expenseCategory.save();
    (0, response_1.SuccessResponse)(res, { message: "ExpenseCategory updated successfully", expenseCategory });
};
exports.updateExpenseCategory = updateExpenseCategory;
const getExpenseCategoryById = async (req, res) => {
    const { id } = req.params;
    const expenseCategory = await expensecategory_1.ExpenseCategoryModel.findById(id);
    if (!expenseCategory)
        throw new Errors_1.NotFound("ExpenseCategory not found");
    (0, response_1.SuccessResponse)(res, { message: "ExpenseCategory found successfully", expenseCategory });
};
exports.getExpenseCategoryById = getExpenseCategoryById;
const deleteExpenseCategory = async (req, res) => {
    const { id } = req.params;
    const expenseCategory = await expensecategory_1.ExpenseCategoryModel.findById(id);
    if (!expenseCategory)
        throw new Errors_1.NotFound("ExpenseCategory not found");
    await expensecategory_1.ExpenseCategoryModel.findByIdAndDelete(id);
    (0, response_1.SuccessResponse)(res, { message: "ExpenseCategory deleted successfully" });
};
exports.deleteExpenseCategory = deleteExpenseCategory;
