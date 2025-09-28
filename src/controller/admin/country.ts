import { UnauthorizedError } from"../../Errors";
import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import { Country } from "../../models/schema/users/Country";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/";

export const getCountries = async (req: Request, res: Response) => {
    const countries = await Country.find();
    if (!countries || countries.length === 0) throw new NotFound("No countries found");
    SuccessResponse(res, { message: "get all countries successfully", countries });
}
export const getCountryById = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Country id is required");
    const country = await Country.findById(id);
    if (!country) throw new NotFound("Country not found");
    SuccessResponse(res, { message: "get country successfully", country });
}

export const createCountry = async (req: Request, res: Response) => {
    const { name} = req.body;
    if (!name ) throw new BadRequest("Country name, code and phone code are required");
    const country = await Country.create({ name });
    SuccessResponse(res, { message: "create country successfully", country });
}

export const updateCountry = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Country id is required");
    const updateData: any = { ...req.body };
    const country = await Country.findByIdAndUpdate(id, updateData, { new: true });
    if (!country) throw new NotFound("Country not found");
    SuccessResponse(res, { message: "update country successfully", country });
}

export const deleteCountry = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Country id is required");
    const country = await Country.findByIdAndDelete(id);
    if (!country) throw new NotFound("Country not found");
    SuccessResponse(res, { message: "delete country successfully", country });

};