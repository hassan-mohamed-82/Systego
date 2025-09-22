import { Request, Response } from "express";
import { BillerModel } from "../models/schema/Biller";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound } from "../Errors/";
import { SuccessResponse } from "../utils/response";
import { saveBase64Image } from "../utils/handleImages";

// ✅ Create
export const createBiller = async (req: Request, res: Response) => {
  const { name, company_name, vat_number, email, phone_number, address, image } = req.body;

  if (!name || !email || !phone_number) {
    throw new BadRequest("Name, email, and phone_number are required");
  }

  let imageUrl = "";
  if (image) {
    imageUrl = await saveBase64Image(image, Date.now().toString(), req, "billers");
  }

  const biller = await BillerModel.create({
    name,
    company_name,
    vat_number,
    email,
    phone_number,
    address,
    image: imageUrl,
  });

  SuccessResponse(res, { message: "Biller created successfully", biller });
};

// ✅ Get All
export const getBillers = async (req: Request, res: Response) => {
  const billers = await BillerModel.find();
  if (!billers || billers.length === 0) throw new NotFound("No billers found");
  SuccessResponse(res, { message: "Get billers successfully", billers });
};

// ✅ Get By ID
export const getBillerById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Biller ID is required");

  const biller = await BillerModel.findById(id);
  if (!biller) throw new NotFound("Biller not found");

  SuccessResponse(res, { message: "Get biller successfully", biller });
};

// ✅ Update
export const updateBiller = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Biller ID is required");

  const updateData: any = { ...req.body, updated_at: new Date() };

  if (req.body.image) {
    updateData.image = await saveBase64Image(req.body.image, Date.now().toString(), req, "billers");
  }

  const biller = await BillerModel.findByIdAndUpdate(id, updateData, { new: true });
  if (!biller) throw new NotFound("Biller not found");

  SuccessResponse(res, { message: "Biller updated successfully", biller });
};

// ✅ Delete
export const deleteBiller = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Biller ID is required");

  const biller = await BillerModel.findByIdAndDelete(id);
  if (!biller) throw new NotFound("Biller not found");

  SuccessResponse(res, { message: "Biller deleted successfully" });
};
