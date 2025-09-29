"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCategory = exports.deleteCategory = exports.getCategoryById = exports.getCategories = exports.createcategory = void 0;
const response_1 = require("../../utils/response");
const category_1 = require("../../models/schema/admin/category");
const handleImages_1 = require("../../utils/handleImages");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors/");
const createcategory = async (req, res) => {
    const { name, image, parentId } = req.body;
    if (!name)
        throw new BadRequest_1.BadRequest("Category name is required");
    const existingCategory = await category_1.CategoryModel.findOne({ name });
    if (existingCategory)
        throw new BadRequest_1.BadRequest("Category already exists");
    let imageUrl = "";
    if (image) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "category");
    }
    const category = await category_1.CategoryModel.create({ name, image: imageUrl, parentId });
    (0, response_1.SuccessResponse)(res, { message: "create category successfully", category });
};
exports.createcategory = createcategory;
const getCategories = async (req, res) => {
    const categories = await category_1.CategoryModel.find({}).populate("parentId");
    if (!categories || categories.length === 0)
        throw new Errors_1.NotFound("No categories found");
    (0, response_1.SuccessResponse)(res, { message: "get categories successfully", categories });
};
exports.getCategories = getCategories;
const getCategoryById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Category id is required");
    const category = await category_1.CategoryModel.findById(id);
    if (!category)
        throw new Errors_1.NotFound("Category not found");
    (0, response_1.SuccessResponse)(res, { message: "get category successfully", category });
};
exports.getCategoryById = getCategoryById;
const deleteCategory = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Category id is required");
    const category = await category_1.CategoryModel.findByIdAndDelete(id);
    if (!category)
        throw new Errors_1.NotFound("Category not found");
    (0, response_1.SuccessResponse)(res, { message: "delete category successfully" });
};
exports.deleteCategory = deleteCategory;
const updateCategory = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Category id is required");
    const updateData = { ...req.body };
    if (req.body.image) {
        updateData.image = await (0, handleImages_1.saveBase64Image)(req.body.image, Date.now().toString(), req, "category");
    }
    const category = await category_1.CategoryModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!category)
        throw new Errors_1.NotFound("Category not found");
    (0, response_1.SuccessResponse)(res, { message: "update category successfully", category });
};
exports.updateCategory = updateCategory;
