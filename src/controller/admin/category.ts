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
  
  if (!name) throw new BadRequest("Category name is required");
  
  const existingCategory = await CategoryModel.findOne({ name });
  if (existingCategory) throw new BadRequest("Category already exists");

  let imageUrl = "";
  if (image) {
    imageUrl = await saveBase64Image(image, Date.now().toString(), req, "category");
  }

  const category = await CategoryModel.create({
    name,
    ar_name,
    image: imageUrl,
    parentId: parentId && parentId !== "" ? parentId : undefined,  // 👈 لو فاضي يبقى undefined
  });
  
  SuccessResponse(res, { message: "Category created successfully", category });
};


export const getCategories = async (req: Request, res: Response) => {
  const categories = await CategoryModel.find({}).populate("parentId", "name");
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
  
  // 👈 لو parentId فاضي أو null، شيله
  if (parentId !== undefined) {
    category.parentId = parentId && parentId !== "" ? parentId : undefined;
  }
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
  const arrayBuffer = req.file.buffer.buffer.slice(
    req.file.buffer.byteOffset,
    req.file.buffer.byteOffset + req.file.buffer.byteLength
  ) as ArrayBuffer;
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.getWorksheet(1);

  if (!worksheet) {
    throw new BadRequest("Invalid Excel file");
  }

  // اقرأ الـ headers عشان نعرف ترتيب الأعمدة
  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = cell.value?.toString().trim().toLowerCase() || "";
  });

  // ابحث عن الأعمدة بالاسم
  const findColumn = (names: string[]): number => {
    for (const name of names) {
      const index = headers.findIndex(h => h === name.toLowerCase());
      if (index !== -1) return index;
    }
    return -1;
  };

  const cols = {
    name: findColumn(["name", "category name", "الاسم"]),
    ar_name: findColumn(["ar_name", "arabic name", "الاسم بالعربي"]),
    parent: findColumn(["parent", "parent category", "القسم الرئيسي"]),
    image: findColumn(["image", "photo", "الصورة"]),
  };

  const categories: Array<{
    name: string;
    ar_name: string;
    parent: string;
    image: string;
  }> = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const getValue = (colIndex: number): string => {
      if (colIndex === -1) return "";
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

  // رتب الـ categories: الـ parents الأول
  const sortedCategories = [...categories].sort((a, b) => {
    if (!a.parent && b.parent) return -1;
    if (a.parent && !b.parent) return 1;
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
      const newCategory = await CategoryModel.create({
        name: cat.name,
        ar_name: cat.ar_name,
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
