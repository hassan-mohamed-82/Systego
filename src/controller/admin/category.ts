import { UnauthorizedError } from "../../Errors/";
import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import {CategoryModel  } from "../../models/schema/admin/category";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/";

export const createcategory = async (req: Request, res: Response) => {
  const { name, image, parentId, number_of_products, stock_quantity, value } = req.body;
  if (!name || !number_of_products || !stock_quantity) throw new BadRequest("Category name is required");
  const existingCategory = await CategoryModel.findOne({ name });
  if (existingCategory) throw new BadRequest("Category already exists");

  let imageUrl = "";
  if (image) {
    imageUrl = await saveBase64Image(image, Date.now().toString(), req, "category");
  }

  const category = await CategoryModel.create({ name, image: imageUrl , parentId, number_of_products, stock_quantity, value });
  SuccessResponse(res, { message: "create category successfully", category });
};

export const getCategories = async (req: Request, res: Response) => {
  const categories = await CategoryModel.find({}).populate("parentId");
  if (!categories || categories.length === 0) throw new NotFound("No categories found");
  SuccessResponse(res, { message: "get categories successfully", categories });
};

export const getCategoryById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Category id is required");
  const category = await CategoryModel.findById(id);
  if (!category) throw new NotFound("Category not found");
  SuccessResponse(res, { message: "get category successfully", category });
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
