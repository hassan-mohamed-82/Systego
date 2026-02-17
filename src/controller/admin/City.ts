import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import { CityModels } from "../../models/schema/admin/City";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/";
import { CountryModel } from "../../models/schema/admin/Country";
import { ZoneModel } from "../../models/schema/admin/Zone";

export const createCity = async (req: Request, res: Response) => {
  const { name, ar_name, country, shipingCost } = req.body;
  if (!name || !ar_name || !country || shipingCost === undefined) {
    throw new BadRequest("name, ar_name, country, and shipingCost are required");
  }

  const countryExists = await CountryModel.findById(country);
  if (!countryExists) throw new NotFound("Country not found");

  const existingCity = await CityModels.findOne({ name, country });
  if (existingCity) throw new BadRequest("City already exists in this country");

  const city = await CityModels.create({ name, ar_name, country, shipingCost });
  await city.populate("country");

  SuccessResponse(res, { message: "City created successfully", city });
};

export const getCities = async (req: Request, res: Response) => {
  const cities = await CityModels.find().populate("country");
  const countries = await CountryModel.find();

  SuccessResponse(res, { message: "Cities fetched successfully", cities, countries });
};

export const getCityById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("City id is required");

  const city = await CityModels.findById(id).populate("country");
  if (!city) throw new NotFound("City not found");

  SuccessResponse(res, { message: "City fetched successfully", city });
};

export const updateCity = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("City id is required");

  const existingCity = await CityModels.findById(id);
  if (!existingCity) throw new NotFound("City not found");

  const { name, ar_name, country, shipingCost } = req.body;

  // Check for duplicate name in the same country
  if (name) {
    const resolvedCountry = country || existingCity.country;
    const duplicate = await CityModels.findOne({ name, country: resolvedCountry, _id: { $ne: id } });
    if (duplicate) throw new BadRequest("City with this name already exists in this country");
  }

  // Verify country exists if being updated
  if (country) {
    const countryExists = await CountryModel.findById(country);
    if (!countryExists) throw new NotFound("Country not found");
  }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (ar_name !== undefined) updateData.ar_name = ar_name;
  if (country !== undefined) updateData.country = country;
  if (shipingCost !== undefined) updateData.shipingCost = shipingCost;

  const city = await CityModels.findByIdAndUpdate(id, updateData, { new: true }).populate("country");

  // If shipingCost changed, recalculate shipingCost for all zones in this city
  if (shipingCost !== undefined) {
    const zones = await ZoneModel.find({ cityId: id });
    for (const zone of zones) {
      const cityCost = Number(shipingCost) || 0;
      const zoneCost = Number(zone.cost) || 0;
      await ZoneModel.findByIdAndUpdate(zone._id, { shipingCost: cityCost + zoneCost });
    }
  }

  SuccessResponse(res, { message: "City updated successfully", city });
};

export const deleteCity = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("City id is required");

  const city = await CityModels.findByIdAndDelete(id);
  if (!city) throw new NotFound("City not found");

  // Delete all zones belonging to this city
  await ZoneModel.deleteMany({ cityId: id });

  SuccessResponse(res, { message: "City deleted successfully" });
};
