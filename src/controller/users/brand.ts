import { BrandModel } from '../../models/schema/admin/brand';
import { NotFound } from '../../Errors/NotFound'
import { SuccessResponse} from '../../utils/response';
import { BadRequest } from '../../Errors/BadRequest';
import { Request, Response } from 'express';


export const getAllBrands = async (req: Request, res: Response) => {
  const brands = await BrandModel.find()
    .sort({ created_at: -1 });

   SuccessResponse(res, { message: 'Brands retrieved successfully', data: brands }, 200);
};

export const getBrandById = async (req:Request, res:Response) => {
  const id = req.params.id;
  const brand = await BrandModel.findOne({ _id: id})

  if (!brand) {
    throw new NotFound('Brand not found');
  }

   SuccessResponse(res, { message: 'Brand retrieved successfully', data: brand }, 200);
};