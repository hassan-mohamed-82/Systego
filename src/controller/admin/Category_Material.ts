import { UnauthorizedError } from "../../Errors/";
import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import {CategoryMaterialModel  } from "../../models/schema/admin/Category_Material";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/";
import { ProductModel } from "../../models/schema/admin/products";
import {deletePhotoFromServer} from "../../utils/deleteImage"
import mongoose from "mongoose";

export const createcategory = async (req: Request, res: Response) => {
  const { name, ar_name, image, parentId } = req.body;
  if (!name ) throw new BadRequest("Category name is required");
  const existingCategory = await CategoryMaterialModel.findOne({ name });
  if (existingCategory) throw new BadRequest("Category already exists");
  
  if(parentId){
    const parentCategory = await CategoryMaterialModel.findById(parentId);
    if (!parentCategory) throw new BadRequest("Parent category not found");
  }
  let imageUrl = "";
  if (image) {
    imageUrl = await saveBase64Image(image, Date.now().toString(), req, "category");
  }


  const category = await CategoryMaterialModel.create({ name, ar_name, image: imageUrl , parentId });
  SuccessResponse(res, { message: "create category successfully", category });
};

export const getCategories = async (req: Request, res: Response) => {
  // كل الكاتيجوريز مع populate للـ parent
  const categories = await CategoryMaterialModel.find({}).populate("parent_category_id", "name");
  if (!categories || categories.length === 0) throw new NotFound("No categories found");

  // نجيب كل الـ IDs اللي موجودة كـ parent لأي category
  const parentIds = categories
    .map(cat => cat.parent_category_id)
    .filter(id => id != null)
    .map(id => (id as any)._id?.toString());

  // الكاتيجوريز الأب فقط اللي عندهم أطفال
  const ParentCategories = categories.filter(cat => parentIds.includes(cat._id.toString()));

  SuccessResponse(res, { 
    message: "get categories successfully", 
    categories,
    ParentCategories 
  });
};



export const getCategoryById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Category ID is required");
  if (!mongoose.Types.ObjectId.isValid(id)) throw new BadRequest("Invalid category ID");

  const category = await CategoryMaterialModel.findById(id).populate("parent_category_id", "name");
  if (!category) throw new NotFound("Category not found");

  const parentCategoryId = category.parent_category_id;
  SuccessResponse(res, {
    message: "Get category successfully",
    category,
    parentCategoryId,
  });
}

export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) throw new BadRequest("Category id is required");

  if (!mongoose.Types.ObjectId.isValid(id)) throw new BadRequest("Invalid category id");

  const category = await CategoryMaterialModel.findById(id);
  if (!category) throw new NotFound("Category not found");

  const deleteCategoryAndChildren = async (categoryId: string) => {
    // حذف المنتجات المرتبطة
    await ProductModel.deleteMany({ categoryId });

    // حذف الأبناء أولاً
    const children = await CategoryMaterialModel.find({ parentId: categoryId });
    for (const child of children) {
      await deleteCategoryAndChildren(child._id.toString());
    }

    // حذف صورة الكاتيجوري من السيرفر
    if (category.image) {
      try {
        await deletePhotoFromServer(category.image);
      } catch (err) {
        console.error("Failed to delete category image:", err);
      }
    }

    // حذف الكاتيجوري نفسه
    await CategoryMaterialModel.findByIdAndDelete(categoryId);
  };

  await deleteCategoryAndChildren(id);

  SuccessResponse(res, { message: "Category and related data deleted successfully" });
};


export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Category id is required");

  const updateData: any = { ...req.body };

  const category = await CategoryMaterialModel.findById(id);
  if (!category) throw new NotFound("Category not found");

  // إذا كان في صورة جديدة، نحذف القديمة أولاً
  if (req.body.image) {
    if (category.image) {
      try {
        await deletePhotoFromServer(category.image);
      } catch (err) {
        console.error("Failed to delete old image:", err);
      }
    }
    updateData.image = await saveBase64Image(
      req.body.image,
      Date.now().toString(),
      req,
      "category"
    );
  }

  const updatedCategory = await CategoryMaterialModel.findByIdAndUpdate(id, updateData, { new: true });

  SuccessResponse(res, { message: "Category updated successfully", category: updatedCategory });
};