import { Request, Response } from 'express';
import { ExpenseCategoryModel } from '../models/schema/ExpenseCategory';
import { BadRequest } from '../Errors/BadRequest';
import { NotFound } from '../Errors/NotFound';
import { UnauthorizedError } from '../Errors/unauthorizedError';
import { SuccessResponse } from '../utils/response';
import { saveBase64Image } from '../utils/handleImages';

export const createExpenseCategory = async (req: Request, res: Response) => {
const { name}=req.body;
if(!name) throw new BadRequest("Please provide all the required fields");
const category = await ExpenseCategoryModel.findOne({name});
if(category) throw new BadRequest("Category already exists");
const newCategories = await ExpenseCategoryModel.create({name});
SuccessResponse(res,{message:"Category created successfully", newCategories});
};

export const getExpenseCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Category id is required");
  const category = await ExpenseCategoryModel.findById(id);
  if (!category) throw new NotFound("Category not found");
  SuccessResponse(res, { message: "get category successfully", category });
};

export const getExpenseCategories = async (req: Request, res: Response) => {
  const categories = await ExpenseCategoryModel.find({})
  if (!categories || categories.length === 0) throw new NotFound("No categories found");
  SuccessResponse(res, { message: "get categories successfully", categories });
};

export const deleteExpenseCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Category id is required");
  const category = await ExpenseCategoryModel.findByIdAndDelete(id);
  if (!category) throw new NotFound("Category not found");
  SuccessResponse(res, { message: "delete category successfully" });
};

export const updateExpenseCategory = async (req: Request, res: Response) => {
  const{id}=req.params;
  if(!id) throw new BadRequest("Category id is required");
  const updateData: any = { ...req.body };
  const category = await ExpenseCategoryModel.findByIdAndUpdate(id, updateData, { new: true });
  if (!category) throw new NotFound("Category not found");
  SuccessResponse(res, { message: "update category successfully", category });
};