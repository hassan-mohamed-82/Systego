"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCategory = exports.deleteCategory = exports.getCategoryById = exports.getCategories = exports.createcategory = void 0;
const response_1 = require("../../utils/response");
const category_1 = require("../../models/schema/admin/category");
const handleImages_1 = require("../../utils/handleImages");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors/");
const products_1 = require("../../models/schema/admin/products");
const mongoose_1 = __importDefault(require("mongoose"));
const createcategory = async (req, res) => {
    const { name, image, parentId } = req.body;
    if (!name)
        throw new BadRequest_1.BadRequest("Category name is required");
    const existingCategory = await category_1.CategoryModel.findOne({ name });
    if (existingCategory)
        throw new BadRequest_1.BadRequest("Category already exists");
    if (parentId) {
        const parentCategory = await category_1.CategoryModel.findById(parentId);
        if (!parentCategory)
            throw new BadRequest_1.BadRequest("Parent category not found");
    }
    let imageUrl = "";
    if (image) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "category");
    }
    const category = await category_1.CategoryModel.create({ name, image: imageUrl, parentId });
    (0, response_1.SuccessResponse)(res, { message: "create category successfully", category });
};
exports.createcategory = createcategory;
const getCategories = async (req, res) => {
    const categories = await category_1.CategoryModel.find({}).populate("parentId", "name");
    if (!categories || categories.length === 0)
        throw new Errors_1.NotFound("No categories found");
    const ParentCategories = categories.filter(cat => !cat.parentId);
    (0, response_1.SuccessResponse)(res, { message: "get categories successfully", categories, ParentCategories });
};
exports.getCategories = getCategories;
const getCategoryById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Category id is required");
    const category = await category_1.CategoryModel.findById(id).populate("parentId", "name");
    if (!category)
        throw new Errors_1.NotFound("Category not found");
    const Parent = category.parentId;
    (0, response_1.SuccessResponse)(res, { message: "get category successfully", category, Parent });
};
exports.getCategoryById = getCategoryById;
const deleteCategory = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Category id is required");
    if (!mongoose_1.default.Types.ObjectId.isValid(id))
        throw new BadRequest_1.BadRequest("Invalid category id");
    const category = await category_1.CategoryModel.findById(id);
    if (!category)
        throw new Errors_1.NotFound("Category not found");
    const deleteCategoryAndChildren = async (categoryId) => {
        await products_1.ProductModel.deleteMany({ categoryId });
        const children = await category_1.CategoryModel.find({ parentId: categoryId });
        for (const child of children) {
            await deleteCategoryAndChildren(child._id.toString());
        }
        await category_1.CategoryModel.findByIdAndDelete(categoryId);
    };
    await deleteCategoryAndChildren(id);
    (0, response_1.SuccessResponse)(res, { message: "Category and related data deleted successfully" });
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
