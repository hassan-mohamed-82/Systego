import { ProductModel } from '../../models/schema/admin/products';
import asyncHandler from 'express-async-handler';
import { NotFound } from '../../Errors/NotFound'
import { SuccessResponse} from '../../utils/response';


export const getAllProducts = asyncHandler(async (req, res) => {
  const products = await ProductModel.find().sort({ created_at: -1 });

  return SuccessResponse(res, { message: 'Products retrieved successfully', data: products }, 200);
});

export const getProductById = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const product = await ProductModel.findOne({ _id: id})

  if (!product) {
    throw new NotFound('Product not found');
  }

  return SuccessResponse(res, { message: 'Product retrieved successfully', data: product }, 200);
});