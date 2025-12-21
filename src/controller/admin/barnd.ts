import { UnauthorizedError } from"../../Errors";
import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import { BrandModel } from "../../models/schema/admin/brand";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/";
import { CategoryModel } from "../../models/schema/admin/category";
import { ProductModel } from "../../models/schema/admin/products";

export const getBrands = async (req: Request, res: Response) => {
  const brands = await BrandModel.find();
  if (!brands || brands.length === 0) throw new NotFound("No brands found");
  SuccessResponse(res, { message: "get all brands successfully", brands });
};

export const getBrandById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Brand id is required");
  const brand = await BrandModel.findById(id);
  if (!brand) throw new NotFound("Brand not found");
  SuccessResponse(res, { message: "get brand successfully", brand });
};

export const createBrand = async (req: Request, res: Response) => {
  const { name, logo, ar_name } = req.body;
  if (!name) throw new BadRequest("Brand name is required");
  const existingBrand = await BrandModel.findOne({ name });
  if (existingBrand) throw new BadRequest("Brand already exists");

  let logoUrl = "";
  if (logo) {
    logoUrl = await saveBase64Image(logo, Date.now().toString(), req, "brands");
  }

  const brand = await BrandModel.create({ name, ar_name, logo: logoUrl });
  SuccessResponse(res, { message: "create brand successfully", brand });
};

export const updateBrand = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Brand id is required");

  const updateData: any = { ...req.body };

  if (req.body.logo) {
    updateData.logo = await saveBase64Image(
      req.body.logo,
      Date.now().toString(),
      req,
      "brands"
    );
  }

  const brand = await BrandModel.findByIdAndUpdate(id, updateData, { new: true });
  if (!brand) throw new NotFound("Brand not found");

  SuccessResponse(res, { message: "update brand successfully", brand });
};

export const deleteBrand = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Brand id is required");
  const brand = await BrandModel.findByIdAndDelete(id);
  if (!brand) throw new NotFound("Brand not found");
  SuccessResponse(res, { message: "delete brand successfully" });
};


export const deletemanybrands = async (req: Request, res: Response) => {
  const { ids } = req.body;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new BadRequest("At least one brand ID is required");
  }

  // 1️⃣ هات كل الـ Categories اللي تابعة للـ Brands دي
  const categories = await CategoryModel.find({ brand_id: { $in: ids } });
  const categoryIds = categories.map(cat => cat._id);

  // 2️⃣ امسح كل الـ Products اللي تابعة للـ Categories دي
  const productsResult = await ProductModel.deleteMany({ category_id: { $in: categoryIds } });

  // 3️⃣ امسح الـ Categories
  const categoriesResult = await CategoryModel.deleteMany({ brand_id: { $in: ids } });

  // 4️⃣ امسح الـ Brands نفسها
  const brandsResult = await BrandModel.deleteMany({ _id: { $in: ids } });

  SuccessResponse(res, { 
    message: "Brands, categories and products deleted successfully",
    deletedBrands: brandsResult.deletedCount,
    deletedCategories: categoriesResult.deletedCount,
    deletedProducts: productsResult.deletedCount
  });
};
