"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCategory = exports.deleteCategory = exports.getCategoryById = exports.getCategories = exports.createcategory = void 0;
const response_1 = require("../../utils/response");
const Category_Material_1 = require("../../models/schema/admin/Category_Material");
const handleImages_1 = require("../../utils/handleImages");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors/");
const products_1 = require("../../models/schema/admin/products");
const deleteImage_1 = require("../../utils/deleteImage");
const mongoose_1 = __importDefault(require("mongoose"));
const createcategory = async (req, res) => {
    const { name, ar_name, image, parentId } = req.body;
    if (!name)
        throw new BadRequest_1.BadRequest("Category name is required");
    const existingCategory = await Category_Material_1.CategoryMaterialModel.findOne({ name });
    if (existingCategory)
        throw new BadRequest_1.BadRequest("Category already exists");
    if (parentId) {
        const parentCategory = await Category_Material_1.CategoryMaterialModel.findById(parentId);
        if (!parentCategory)
            throw new BadRequest_1.BadRequest("Parent category not found");
    }
    let imageUrl = "";
    if (image) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "category");
    }
    const category = await Category_Material_1.CategoryMaterialModel.create({ name, ar_name, image: imageUrl, parentId });
    (0, response_1.SuccessResponse)(res, { message: "create category successfully", category });
};
exports.createcategory = createcategory;
const getCategories = async (req, res) => {
    // كل الكاتيجوريز مع populate للـ parent
    const categories = await Category_Material_1.CategoryMaterialModel.find({}).populate("parent_category_id", "name");
    if (!categories || categories.length === 0)
        throw new Errors_1.NotFound("No categories found");
    // نجيب كل الـ IDs اللي موجودة كـ parent لأي category
    const parentIds = categories
        .map(cat => cat.parent_category_id)
        .filter(id => id != null)
        .map(id => id._id?.toString());
    // الكاتيجوريز الأب فقط اللي عندهم أطفال
    const ParentCategories = categories.filter(cat => parentIds.includes(cat._id.toString()));
    (0, response_1.SuccessResponse)(res, {
        message: "get categories successfully",
        categories,
        ParentCategories
    });
};
exports.getCategories = getCategories;
const getCategoryById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Category ID is required");
    if (!mongoose_1.default.Types.ObjectId.isValid(id))
        throw new BadRequest_1.BadRequest("Invalid category ID");
    const category = await Category_Material_1.CategoryMaterialModel.findById(id).populate("parent_category_id", "name");
    if (!category)
        throw new Errors_1.NotFound("Category not found");
    const parentCategoryId = category.parent_category_id;
    (0, response_1.SuccessResponse)(res, {
        message: "Get category successfully",
        category,
        parentCategoryId,
    });
};
exports.getCategoryById = getCategoryById;
const deleteCategory = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Category id is required");
    if (!mongoose_1.default.Types.ObjectId.isValid(id))
        throw new BadRequest_1.BadRequest("Invalid category id");
    const category = await Category_Material_1.CategoryMaterialModel.findById(id);
    if (!category)
        throw new Errors_1.NotFound("Category not found");
    const deleteCategoryAndChildren = async (categoryId) => {
        // حذف المنتجات المرتبطة
        await products_1.ProductModel.deleteMany({ categoryId });
        // حذف الأبناء أولاً
        const children = await Category_Material_1.CategoryMaterialModel.find({ parentId: categoryId });
        for (const child of children) {
            await deleteCategoryAndChildren(child._id.toString());
        }
        // حذف صورة الكاتيجوري من السيرفر
        if (category.image) {
            try {
                await (0, deleteImage_1.deletePhotoFromServer)(category.image);
            }
            catch (err) {
                console.error("Failed to delete category image:", err);
            }
        }
        // حذف الكاتيجوري نفسه
        await Category_Material_1.CategoryMaterialModel.findByIdAndDelete(categoryId);
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
    const category = await Category_Material_1.CategoryMaterialModel.findById(id);
    if (!category)
        throw new Errors_1.NotFound("Category not found");
    // إذا كان في صورة جديدة، نحذف القديمة أولاً
    if (req.body.image) {
        if (category.image) {
            try {
                await (0, deleteImage_1.deletePhotoFromServer)(category.image);
            }
            catch (err) {
                console.error("Failed to delete old image:", err);
            }
        }
        updateData.image = await (0, handleImages_1.saveBase64Image)(req.body.image, Date.now().toString(), req, "category");
    }
    const updatedCategory = await Category_Material_1.CategoryMaterialModel.findByIdAndUpdate(id, updateData, { new: true });
    (0, response_1.SuccessResponse)(res, { message: "Category updated successfully", category: updatedCategory });
};
exports.updateCategory = updateCategory;
