"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateIncomeCategoriesgory = exports.deleteIncomeCategories = exports.getIncomeCategories = exports.getIncomeCategoriesById = exports.createIncomeCategories = void 0;
const income_categories_1 = require("../models/schema/income_categories");
const BadRequest_1 = require("../Errors/BadRequest");
const NotFound_1 = require("../Errors/NotFound");
const response_1 = require("../utils/response");
const createIncomeCategories = async (req, res) => {
    const { name } = req.body;
    if (!name)
        throw new BadRequest_1.BadRequest("Please provide all the required fields");
    const category = await income_categories_1.IncomeCategoriesModel.findOne({ name });
    if (category)
        throw new BadRequest_1.BadRequest("Category already exists");
    const newCategories = await income_categories_1.IncomeCategoriesModel.create({ name });
    (0, response_1.SuccessResponse)(res, { message: "Category created successfully", newCategories });
};
exports.createIncomeCategories = createIncomeCategories;
const getIncomeCategoriesById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Category id is required");
    const category = await income_categories_1.IncomeCategoriesModel.findById(id);
    if (!category)
        throw new NotFound_1.NotFound("Category not found");
    (0, response_1.SuccessResponse)(res, { message: "get category successfully", category });
};
exports.getIncomeCategoriesById = getIncomeCategoriesById;
const getIncomeCategories = async (req, res) => {
    const categories = await income_categories_1.IncomeCategoriesModel.find({});
    if (!categories || categories.length === 0)
        throw new NotFound_1.NotFound("No categories found");
    (0, response_1.SuccessResponse)(res, { message: "get categories successfully", categories });
};
exports.getIncomeCategories = getIncomeCategories;
const deleteIncomeCategories = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Category id is required");
    const category = await income_categories_1.IncomeCategoriesModel.findByIdAndDelete(id);
    if (!category)
        throw new NotFound_1.NotFound("Category not found");
    (0, response_1.SuccessResponse)(res, { message: "delete category successfully" });
};
exports.deleteIncomeCategories = deleteIncomeCategories;
const updateIncomeCategoriesgory = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Category id is required");
    const updateData = { ...req.body };
    const category = await income_categories_1.IncomeCategoriesModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!category)
        throw new NotFound_1.NotFound("Category not found");
    (0, response_1.SuccessResponse)(res, { message: "update category successfully", category });
};
exports.updateIncomeCategoriesgory = updateIncomeCategoriesgory;
