"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletemanycategories = exports.importCategoriesFromExcel = exports.updateCategory = exports.deleteCategory = exports.getCategoryById = exports.getCategories = exports.createcategory = void 0;
const response_1 = require("../../utils/response");
const category_1 = require("../../models/schema/admin/category");
const handleImages_1 = require("../../utils/handleImages");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors/");
const products_1 = require("../../models/schema/admin/products");
const mongoose_1 = __importDefault(require("mongoose"));
const exceljs_1 = __importDefault(require("exceljs"));
const createcategory = async (req, res) => {
    const { name, ar_name, image, parentId } = req.body;
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
    const category = await category_1.CategoryModel.create({ name, ar_name, image: imageUrl, parentId });
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
// controllers/admin/category.ts
const importCategoriesFromExcel = async (req, res) => {
    if (!req.file) {
        throw new BadRequest_1.BadRequest("Excel file is required");
    }
    const workbook = new exceljs_1.default.Workbook();
    // Convert multer buffer to ArrayBuffer for ExcelJS compatibility
    const arrayBuffer = req.file.buffer.buffer.slice(req.file.buffer.byteOffset, req.file.buffer.byteOffset + req.file.buffer.byteLength);
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
        throw new BadRequest_1.BadRequest("Invalid Excel file");
    }
    const categories = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1)
            return; // Skip header
        const name = row.getCell(1).value?.toString().trim() || "";
        const ar_name = row.getCell(2).value?.toString().trim() || "";
        const parent = row.getCell(3).value?.toString().trim() || "";
        const image = row.getCell(4).value?.toString().trim() || "";
        if (name) {
            categories.push({ name, ar_name, parent, image });
        }
    });
    if (categories.length === 0) {
        throw new BadRequest_1.BadRequest("No valid categories found");
    }
    const results = {
        success: [],
        failed: [],
        skipped: [],
    };
    // خريطة الـ Categories الموجودة
    const categoryMap = {};
    const existingCategories = await category_1.CategoryModel.find({}).lean();
    existingCategories.forEach((cat) => {
        categoryMap[cat.name.toLowerCase()] = cat._id.toString();
    });
    for (const cat of categories) {
        try {
            // لو موجود، skip
            if (categoryMap[cat.name.toLowerCase()]) {
                results.skipped.push({
                    name: cat.name,
                    reason: "Already exists",
                });
                continue;
            }
            // دور على الـ Parent
            let parentId = null;
            if (cat.parent) {
                parentId = categoryMap[cat.parent.toLowerCase()];
                if (!parentId) {
                    const parentCategory = await category_1.CategoryModel.findOne({
                        name: { $regex: new RegExp(`^${cat.parent}$`, "i") },
                    });
                    if (parentCategory) {
                        parentId = parentCategory._id.toString();
                        categoryMap[cat.parent.toLowerCase()] = parentId;
                    }
                    else {
                        results.failed.push({
                            name: cat.name,
                            reason: `Parent "${cat.parent}" not found`,
                        });
                        continue;
                    }
                }
            }
            // أضف الـ Category
            const newCategory = await category_1.CategoryModel.create({
                name: cat.name,
                ar_name: cat.ar_name || "",
                parentId: parentId || null,
                image: cat.image || "",
            });
            categoryMap[cat.name.toLowerCase()] = newCategory._id.toString();
            results.success.push(cat.name);
        }
        catch (error) {
            results.failed.push({
                name: cat.name,
                reason: error.message || "Unknown error",
            });
        }
    }
    return (0, response_1.SuccessResponse)(res, {
        message: "Import completed",
        total: categories.length,
        success_count: results.success.length,
        failed_count: results.failed.length,
        skipped_count: results.skipped.length,
        success: results.success,
        failed: results.failed,
        skipped: results.skipped,
    });
};
exports.importCategoriesFromExcel = importCategoriesFromExcel;
const deletemanycategories = async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new BadRequest_1.BadRequest("At least one category ID is required");
    }
    // 1️⃣ امسح كل الـ Products اللي تابعة للـ Categories دي
    const productsResult = await products_1.ProductModel.deleteMany({ category_id: { $in: ids } });
    // 2️⃣ امسح الـ Categories نفسها
    const categoriesResult = await category_1.CategoryModel.deleteMany({ _id: { $in: ids } });
    (0, response_1.SuccessResponse)(res, {
        message: "Categories and their products deleted successfully",
        deletedCategories: categoriesResult.deletedCount,
        deletedProducts: productsResult.deletedCount
    });
};
exports.deletemanycategories = deletemanycategories;
