"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateExpenseCategory = exports.deleteExpenseCategory = exports.getExpenseCategories = exports.getExpenseCategory = exports.createExpenseCategory = void 0;
const ExpenseCategory_1 = require("../../models/schema/admin/ExpenseCategory");
const BadRequest_1 = require("../../Errors/BadRequest");
const NotFound_1 = require("../../Errors/NotFound");
const response_1 = require("../../utils/response");
const createExpenseCategory = async (req, res) => {
    const { name } = req.body;
    if (!name)
        throw new BadRequest_1.BadRequest("Please provide all the required fields");
    const category = await ExpenseCategory_1.ExpenseCategoryModel.findOne({ name });
    if (category)
        throw new BadRequest_1.BadRequest("Category already exists");
    const newCategories = await ExpenseCategory_1.ExpenseCategoryModel.create({ name });
    (0, response_1.SuccessResponse)(res, { message: "Category created successfully", newCategories });
};
exports.createExpenseCategory = createExpenseCategory;
const getExpenseCategory = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Category id is required");
    const category = await ExpenseCategory_1.ExpenseCategoryModel.findById(id);
    if (!category)
        throw new NotFound_1.NotFound("Category not found");
    (0, response_1.SuccessResponse)(res, { message: "get category successfully", category });
};
exports.getExpenseCategory = getExpenseCategory;
const getExpenseCategories = async (req, res) => {
    const categories = await ExpenseCategory_1.ExpenseCategoryModel.find({});
    if (!categories || categories.length === 0)
        throw new NotFound_1.NotFound("No categories found");
    (0, response_1.SuccessResponse)(res, { message: "get categories successfully", categories });
};
exports.getExpenseCategories = getExpenseCategories;
const deleteExpenseCategory = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Category id is required");
    const category = await ExpenseCategory_1.ExpenseCategoryModel.findByIdAndDelete(id);
    if (!category)
        throw new NotFound_1.NotFound("Category not found");
    (0, response_1.SuccessResponse)(res, { message: "delete category successfully" });
};
exports.deleteExpenseCategory = deleteExpenseCategory;
const updateExpenseCategory = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Category id is required");
    const updateData = { ...req.body };
    const category = await ExpenseCategory_1.ExpenseCategoryModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!category)
        throw new NotFound_1.NotFound("Category not found");
    (0, response_1.SuccessResponse)(res, { message: "update category successfully", category });
};
exports.updateExpenseCategory = updateExpenseCategory;
