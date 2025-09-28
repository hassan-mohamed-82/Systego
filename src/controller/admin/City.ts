import { UnauthorizedError } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import { City } from "../../models/schema/users/City";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/";
import { Country } from "../../models/schema/users/Country";

// Create City
export const createCity = async (req: Request, res: Response) => {
  const { name, country, shippingCost } = req.body;
  if (!name || !country || shippingCost === undefined) {
    throw new BadRequest("City name, country and shippingCost are required");
  }

  const countryExists = await Country.findById(country);
  if (!countryExists) throw new NotFound("Country not found");

  const city = await City.create({ name, country, shippingCost });
  await city.populate("country");

  SuccessResponse(res, { message: "create city successfully", city });
};

// Get All Cities
export const getCities = async (req: Request, res: Response) => {
  const cities = await City.find().populate("country");
  if (!cities || cities.length === 0) throw new NotFound("No cities found");

  SuccessResponse(res, { message: "get all cities successfully", cities });
};

// Get City by Id
export const getCityById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("City id is required");

  const city = await City.findById(id).populate("country");
  if (!city) throw new NotFound("City not found");

  SuccessResponse(res, { message: "get city successfully", city });
};

// Update City
export const updateCity = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("City id is required");

  const updateData: any = { ...req.body };

  if (req.body.country) {
    const countryExists = await Country.findById(req.body.country);
    if (!countryExists) throw new NotFound("Country not found");
  }

  const city = await City.findByIdAndUpdate(id, updateData, { new: true }).populate("country");
  if (!city) throw new NotFound("City not found");

  SuccessResponse(res, { message: "update city successfully", city });
};

// Delete City
export const deleteCity = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("City id is required");

  const city = await City.findByIdAndDelete(id);
  if (!city) throw new NotFound("City not found");

  SuccessResponse(res, { message: "delete city successfully", city });
};
