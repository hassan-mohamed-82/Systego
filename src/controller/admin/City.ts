import { UnauthorizedError } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import { CityModels } from "../../models/schema/admin/City";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/";
import { CountryModel } from "../../models/schema/admin/Country";

export const createCity = async (req: Request, res: Response) => {
  const { name, country  } = req.body;
  if (!name || !country ) {
    throw new BadRequest("City name and country  are required");
  }
  const existingCity = await CityModels.findOne({ name, country });
  if (existingCity) throw new BadRequest("City already exists in this country");

  const countryExists = await CountryModel.findById(country);
  if (!countryExists) throw new NotFound("Country not found");

  const city = await CityModels.create({ name, country });
  await city.populate("country");
  const countries = await CountryModel.find();


  SuccessResponse(res, { message: "create city successfully", city, countries });
};
export const getCities = async (req: Request, res: Response) => {
  const cities = await CityModels.find().populate("country");
  if (!cities || cities.length === 0) throw new NotFound("No cities found");
  const countries = await CountryModel.find();

  SuccessResponse(res, { message: "get all cities successfully", cities , countries});
};

export const getCityById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("City id is required");

  const city = await CityModels.findById(id).populate("country");
  if (!city) throw new NotFound("City not found");
  const countries = await CountryModel.find();

  SuccessResponse(res, { message: "get city successfully", city, countries });
};

export const updateCity = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("City id is required");

  const updateData: any = { ...req.body };

  if (req.body.country) {
    const countryExists = await CountryModel.findById(req.body.country);
    if (!countryExists) throw new NotFound("Country not found");
  }

  const city = await CityModels.findByIdAndUpdate(id, updateData, { new: true }).populate("country");
  if (!city) throw new NotFound("City not found");

  SuccessResponse(res, { message: "update city successfully", city });
};




export const deleteCity = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("City id is required");

  const city = await CityModels.findByIdAndDelete(id);
  if (!city) throw new NotFound("City not found");

  SuccessResponse(res, { message: "delete city successfully" });
};


