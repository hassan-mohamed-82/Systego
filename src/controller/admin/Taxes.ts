import { Request, Response } from "express";
import { TaxesModel } from "../../models/schema/admin/Taxes";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const createTaxes = async (req: Request, res: Response) => {
  const { name, status,amount ,type } = req.body;
    if (!name || !amount || !type) {
        throw new BadRequest(" name, amount, type  are required");
    }
    const existingTax = await TaxesModel.findOne({ name });
    if (existingTax) throw new BadRequest("Tax already exists");
    const tax = await TaxesModel.create({ name, status,amount ,type });
    SuccessResponse(res, { message: "Tax created successfully", tax });
};
export const getTaxes = async (req: Request, res: Response) => {
    const taxes = await TaxesModel.find();
    if (!taxes || taxes.length === 0) throw new NotFound("No taxes found");
    SuccessResponse(res, { message: "Get taxes successfully", taxes });
}

export const getTaxesById = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Tax ID is required");
    const tax = await TaxesModel.findById(id);
    if (!tax) throw new NotFound("Tax not found");
    SuccessResponse(res, { message: "Get tax successfully", tax });
}

export const deleteTaxes = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Tax ID is required");
    const tax = await TaxesModel.findByIdAndDelete(id);
    if (!tax) throw new NotFound("Tax not found");
    SuccessResponse(res, { message: "Tax deleted successfully", tax });
}

export const updateTaxes = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Tax ID is required");
    const tax = await TaxesModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!tax) throw new NotFound("Tax not found");
    SuccessResponse(res, { message: "Tax updated successfully", tax });
}

