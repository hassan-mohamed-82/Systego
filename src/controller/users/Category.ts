import { CategoryModel } from '../../models/schema/admin/category';
import asyncHandler from 'express-async-handler';
import { NotFound } from '../../Errors/NotFound'
import { SuccessResponse} from '../../utils/response';


export const getAllCategorys = asyncHandler(async (req, res) => {
  const categories = await CategoryModel.find({ Is_Online: true })
    .sort({ created_at: -1 });

  return SuccessResponse(res, { message: 'Categorys retrieved successfully', data: categories }, 200);
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const category = await CategoryModel.findOne({ _id: id, Is_Online: true })

  if (!category) {
    throw new NotFound('Category not found');
  }

  return SuccessResponse(res, { message: 'Category retrieved successfully', data: category }, 200);
});