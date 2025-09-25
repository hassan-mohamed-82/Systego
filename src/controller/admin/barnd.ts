import { UnauthorizedError } from"../../Errors";
import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import { BrandModel } from "../../models/schema/admin/brand";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/";

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
  const { name, logo } = req.body;
  if (!name) throw new BadRequest("Brand name is required");

  let logoUrl = "";
  if (logo) {
    logoUrl = await saveBase64Image(logo, Date.now().toString(), req, "brands");
  }

  const brand = await BrandModel.create({ name, logo: logoUrl });
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
  SuccessResponse(res, { message: "delete brand successfully", brand });
};
