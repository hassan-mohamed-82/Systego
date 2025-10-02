import { UnauthorizedError } from"../../Errors";
import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import { CountryModel } from "../../models/schema/admin/Country";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/";

export const getCountries = async (req: Request, res: Response) => {
    const countries = await CountryModel.find();
    if (!countries || countries.length === 0) throw new NotFound("No countries found");
    SuccessResponse(res, { message: "get all countries successfully", countries });
}
export const getCountryById = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Country id is required");
    const country = await CountryModel.findById(id);
    if (!country) throw new NotFound("Country not found");
    SuccessResponse(res, { message: "get country successfully", country });
}

export const createCountry = async (req: Request, res: Response) => {
    const { name, isDefault } = req.body;
    if (!name) throw new BadRequest("Country name is required");

    const existingCountry = await CountryModel.findOne({ name });
    if (existingCountry) throw new BadRequest("Country already exists");

    let country;

    if (isDefault) {
        // لو البلد الجديدة Default → شيل العلامة من أي بلد تانية
        await CountryModel.updateMany({}, { $set: { isDefault: false } });
        country = await CountryModel.create({ name, isDefault: true });
    } else {
        country = await CountryModel.create({ name });
    }

    SuccessResponse(res, { message: "create country successfully", country });
}


export const updateCountry = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Country id is required");

    const updateData: any = { ...req.body };

    if (updateData.isDefault) {
        // لو الـ update هيخلي البلد دي Default → لازم نلغي الباقي
        await CountryModel.updateMany({}, { $set: { isDefault: false } });
        updateData.isDefault = true;
    }

    const country = await CountryModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!country) throw new NotFound("Country not found");

    SuccessResponse(res, { message: "update country successfully", country });
}


export const deleteCountry = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Country id is required");
    const country = await CountryModel.findByIdAndDelete(id);
    if (!country) throw new NotFound("Country not found");
    SuccessResponse(res, { message: "delete country successfully", country });

};