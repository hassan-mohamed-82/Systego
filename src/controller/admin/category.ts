import { UnauthorizedError } from "../../Errors/";
import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import {CategoryModel  } from "../../models/schema/admin/category";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/";

export const createcategory = async (req: Request, res: Response) => {
  const { name, image, parentId } = req.body;
  if (!name ) throw new BadRequest("Category name is required");
  const existingCategory = await CategoryModel.findOne({ name });
  if (existingCategory) throw new BadRequest("Category already exists");
  
  if(parentId){
    const parentCategory = await CategoryModel.findById(parentId);
    if (!parentCategory) throw new BadRequest("Parent category not found");
  }
  let imageUrl = "";
  if (image) {
    imageUrl = await saveBase64Image(image, Date.now().toString(), req, "category");
  }


  const category = await CategoryModel.create({ name, image: imageUrl , parentId });
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
  const category = await CategoryModel.findByIdAndDelete(id);
  if (!category) throw new NotFound("Category not found");
  SuccessResponse(res, { message: "delete category successfully" });
};

export const updateCategory =async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Category id is required");

  const updateData: any = { ...req.body };

  if (req.body.image) {
    updateData.image = await saveBase64Image(
      req.body.image,
      Date.now().toString(),
      req,
      "category"
    );
  }

  const category = await CategoryModel.findByIdAndUpdate(id, updateData, { new: true });
  if (!category) throw new NotFound("Category not found");

  SuccessResponse(res, { message: "update category successfully", category });
  
};
