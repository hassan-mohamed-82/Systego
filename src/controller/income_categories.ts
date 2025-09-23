import { Request, Response } from 'express';
import { IncomeCategoriesModel } from '../models/schema/income_categories';
import { BadRequest } from '../Errors/BadRequest';
import { NotFound } from '../Errors/NotFound';
import { UnauthorizedError } from '../Errors/unauthorizedError';
import { SuccessResponse } from '../utils/response';
import { saveBase64Image } from '../utils/handleImages';

export const createIncomeCategories = async (req: Request, res: Response) => {
const { name}=req.body;
if(!name) throw new BadRequest("Please provide all the required fields");
const category = await IncomeCategoriesModel.findOne({name});
if(category) throw new BadRequest("Category already exists");
const newCategories = await IncomeCategoriesModel.create({name});
SuccessResponse(res,{message:"Category created successfully", newCategories});
};

export const getIncomeCategoriesById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Category id is required");
  const category = await IncomeCategoriesModel.findById(id);
  if (!category) throw new NotFound("Category not found");
  SuccessResponse(res, { message: "get category successfully", category });
};

export const getIncomeCategories = async (req: Request, res: Response) => {
  const categories = await IncomeCategoriesModel.find({})
  if (!categories || categories.length === 0) throw new NotFound("No categories found");
  SuccessResponse(res, { message: "get categories successfully", categories });
};

export const deleteIncomeCategories = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Category id is required");
  const category = await IncomeCategoriesModel.findByIdAndDelete(id);
  if (!category) throw new NotFound("Category not found");
  SuccessResponse(res, { message: "delete category successfully" });
};

export const updateIncomeCategoriesgory = async (req: Request, res: Response) => {
  const{id}=req.params;
  if(!id) throw new BadRequest("Category id is required");
  const updateData: any = { ...req.body };
  const category = await IncomeCategoriesModel.findByIdAndUpdate(id, updateData, { new: true });
  if (!category) throw new NotFound("Category not found");
  SuccessResponse(res, { message: "update category successfully", category });
};