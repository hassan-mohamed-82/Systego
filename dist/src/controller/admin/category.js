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
    const { name, ar_name, image, parentId, Is_Online } = req.body;
    if (!name)
        throw new BadRequest_1.BadRequest("Category name is required");
    const existingCategory = await category_1.CategoryModel.findOne({ name });
    if (existingCategory)
        throw new BadRequest_1.BadRequest("Category already exists");
    let imageUrl = "";
    if (image) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "category");
    }
    const category = await category_1.CategoryModel.create({
        name,
        ar_name,
        image: imageUrl,
        parentId: parentId && parentId !== "" ? parentId : undefined, // 👈 لو فاضي يبقى undefined
        Is_Online: Is_Online || true,
    });
    (0, response_1.SuccessResponse)(res, { message: "Category created successfully", category });
};
exports.createcategory = createcategory;
const getCategories = async (req, res) => {
    const categories = await category_1.CategoryModel.find({}).populate("parentId", "name").lean();
    // ✅ احسب العدد الفعلي لكل category
    const categoriesWithCorrectCount = await Promise.all(categories.map(async (cat) => {
        const actualProductCount = await products_1.ProductModel.countDocuments({
            categoryId: cat._id
        });
        return {
            ...cat,
            product_quantity: actualProductCount
        };
    }));
    const ParentCategories = categoriesWithCorrectCount.filter(cat => !cat.parentId);
    (0, response_1.SuccessResponse)(res, {
        message: "get categories successfully",
        categories: categoriesWithCorrectCount,
        ParentCategories
    });
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
    const category = await category_1.CategoryModel.findById(id);
    if (!category)
        throw new Errors_1.NotFound("Category not found");
    const { name, ar_name, parentId, image, Is_Online } = req.body;
    if (name !== undefined)
        category.name = name;
    if (ar_name !== undefined)
        category.ar_name = ar_name;
    if (Is_Online !== undefined)
        category.Is_Online = Is_Online;
    // 👈 لو parentId فاضي أو null، شيله
    if (parentId !== undefined) {
        category.parentId = parentId && parentId !== "" ? parentId : undefined;
    }
    if (image) {
        category.image = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "category");
    }
    await category.save();
    (0, response_1.SuccessResponse)(res, { message: "Category updated successfully", category });
};
exports.updateCategory = updateCategory;
// controllers/admin/category.ts
const importCategoriesFromExcel = async (req, res) => {
    if (!req.file) {
        throw new BadRequest_1.BadRequest("Excel file is required");
    }
    const workbook = new exceljs_1.default.Workbook();
    const arrayBuffer = req.file.buffer.buffer.slice(req.file.buffer.byteOffset, req.file.buffer.byteOffset + req.file.buffer.byteLength);
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
        throw new BadRequest_1.BadRequest("Invalid Excel file");
    }
    // اقرأ الـ headers عشان نعرف ترتيب الأعمدة
    const headers = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString().trim().toLowerCase() || "";
    });
    // ابحث عن الأعمدة بالاسم
    const findColumn = (names) => {
        for (const name of names) {
            const index = headers.findIndex(h => h === name.toLowerCase());
            if (index !== -1)
                return index;
        }
        return -1;
    };
    const cols = {
        name: findColumn(["name", "category name", "الاسم"]),
        ar_name: findColumn(["ar_name", "arabic name", "الاسم بالعربي"]),
        parent: findColumn(["parent", "parent category", "القسم الرئيسي"]),
        image: findColumn(["image", "photo", "الصورة"]),
    };
    const categories = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1)
            return;
        const getValue = (colIndex) => {
            if (colIndex === -1)
                return "";
            return row.getCell(colIndex + 1).value?.toString().trim() || "";
        };
        const name = cols.name !== -1 ? getValue(cols.name) : row.getCell(1).value?.toString().trim() || "";
        const ar_name = cols.ar_name !== -1 ? getValue(cols.ar_name) : row.getCell(2).value?.toString().trim() || "";
        const parent = cols.parent !== -1 ? getValue(cols.parent) : row.getCell(3).value?.toString().trim() || "";
        const image = cols.image !== -1 ? getValue(cols.image) : row.getCell(4).value?.toString().trim() || "";
        if (name) {
            categories.push({ name, ar_name: ar_name || name, parent, image });
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
    // رتب الـ categories: الـ parents الأول
    const sortedCategories = [...categories].sort((a, b) => {
        if (!a.parent && b.parent)
            return -1;
        if (a.parent && !b.parent)
            return 1;
        return 0;
    });
    for (const cat of sortedCategories) {
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
                    results.failed.push({
                        name: cat.name,
                        reason: `Parent "${cat.parent}" not found`,
                    });
                    continue;
                }
            }
            // أضف الـ Category
            const newCategory = await category_1.CategoryModel.create({
                name: cat.name,
                ar_name: cat.ar_name,
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
