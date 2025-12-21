import { UnauthorizedError } from "../../Errors/";
import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import {CategoryModel  } from "../../models/schema/admin/category";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/";
import { ProductModel } from "../../models/schema/admin/products";
import mongoose from "mongoose";
import ExcelJS from "exceljs";


export const createcategory = async (req: Request, res: Response) => {
  const { name, ar_name, image, parentId } = req.body;
  if (!name ) throw new BadRequest("Category name is required");
  const existingCategory = await CategoryModel.findOne({ name });
  if (existingCategory) throw new BadRequest("Category already exists");

  let imageUrl = "";
  if (image) {
    imageUrl = await saveBase64Image(image, Date.now().toString(), req, "category");
  }


  const category = await CategoryModel.create({ name, ar_name, image: imageUrl , parentId });
  SuccessResponse(res, { message: "create category successfully", category });
};

export const getCategories = async (req: Request, res: Response) => {
  const categories = await CategoryModel.find({}).populate("parentId", "name");
  if (!categories || categories.length === 0) throw new NotFound("No categories found");
  const ParentCategories = categories.filter(cat => !cat.parentId);
  SuccessResponse(res, { message: "get categories successfully", categories,ParentCategories });
};

export const getCategoryById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Category id is required");
  const category = await CategoryModel.findById(id).populate("parentId", "name");
  if (!category) throw new NotFound("Category not found");
  const Parent= category.parentId;
  SuccessResponse(res, { message: "get category successfully", category,Parent });
};

export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) throw new BadRequest("Category id is required");

  if (!mongoose.Types.ObjectId.isValid(id)) throw new BadRequest("Invalid category id");

  const category = await CategoryModel.findById(id);
  if (!category) throw new NotFound("Category not found");

  const deleteCategoryAndChildren = async (categoryId: string) => {
    await ProductModel.deleteMany({ categoryId });

    const children = await CategoryModel.find({ parentId: categoryId });

    for (const child of children) {
      await deleteCategoryAndChildren(child._id.toString());
    }

    await CategoryModel.findByIdAndDelete(categoryId);
  };

  await deleteCategoryAndChildren(id);

  SuccessResponse(res, { message: "Category and related data deleted successfully" });
};

export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Category id is required");

  const category = await CategoryModel.findById(id);
  if (!category) throw new NotFound("Category not found");

  const { name, ar_name, parentId, image } = req.body;

  if (name !== undefined) category.name = name;
  if (ar_name !== undefined) category.ar_name = ar_name;
  if (parentId !== undefined) category.parentId = parentId;

  if (image) {
    category.image = await saveBase64Image(
      image,
      Date.now().toString(),
      req,
      "category"
    );
  }

  await category.save();

  SuccessResponse(res, { message: "Category updated successfully", category });
};



// controllers/admin/category.ts


export const importCategoriesFromExcel = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new BadRequest("Excel file is required");
  }

  const workbook = new ExcelJS.Workbook();
  // Convert multer buffer to ArrayBuffer for ExcelJS compatibility
  const arrayBuffer = req.file.buffer.buffer.slice(
    req.file.buffer.byteOffset,
    req.file.buffer.byteOffset + req.file.buffer.byteLength
  ) as ArrayBuffer;
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.getWorksheet(1);

  if (!worksheet) {
    throw new BadRequest("Invalid Excel file");
  }

  const categories: Array<{
    name: string;
    ar_name: string;
    parent: string;
    image: string;
  }> = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const name = row.getCell(1).value?.toString().trim() || "";
    const ar_name = row.getCell(2).value?.toString().trim() || "";
    const parent = row.getCell(3).value?.toString().trim() || "";
    const image = row.getCell(4).value?.toString().trim() || "";

    if (name) {
      categories.push({ name, ar_name, parent, image });
    }
  });

  if (categories.length === 0) {
    throw new BadRequest("No valid categories found");
  }

  const results = {
    success: [] as string[],
    failed: [] as { name: string; reason: string }[],
    skipped: [] as { name: string; reason: string }[],
  };

  // خريطة الـ Categories الموجودة
  const categoryMap: { [key: string]: string } = {};
  const existingCategories = await CategoryModel.find({}).lean();
  existingCategories.forEach((cat: any) => {
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
          const parentCategory = await CategoryModel.findOne({
            name: { $regex: new RegExp(`^${cat.parent}$`, "i") },
          });
          if (parentCategory) {
            parentId = parentCategory._id.toString();
            categoryMap[cat.parent.toLowerCase()] = parentId;
          } else {
            results.failed.push({
              name: cat.name,
              reason: `Parent "${cat.parent}" not found`,
            });
            continue;
          }
        }
      }

      // أضف الـ Category
      const newCategory = await CategoryModel.create({
        name: cat.name,
        ar_name: cat.ar_name || "",
        parentId: parentId || null,
        image: cat.image || "",
      });

      categoryMap[cat.name.toLowerCase()] = newCategory._id.toString();
      results.success.push(cat.name);
    } catch (error: any) {
      results.failed.push({
        name: cat.name,
        reason: error.message || "Unknown error",
      });
    }
  }

  return SuccessResponse(res, {
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


export const deletemanycategories = async (req: Request, res: Response) => {
  const { ids } = req.body;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new BadRequest("At least one category ID is required");
  }

  // 1️⃣ امسح كل الـ Products اللي تابعة للـ Categories دي
  const productsResult = await ProductModel.deleteMany({ category_id: { $in: ids } });
  
  // 2️⃣ امسح الـ Categories نفسها
  const categoriesResult = await CategoryModel.deleteMany({ _id: { $in: ids } });

  SuccessResponse(res, { 
    message: "Categories and their products deleted successfully",
    deletedCategories: categoriesResult.deletedCount,
    deletedProducts: productsResult.deletedCount
  });
};
