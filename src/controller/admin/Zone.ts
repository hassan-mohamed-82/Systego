import { Request, Response } from "express";
import { ZoneModel } from "../../models/schema/admin/Zone";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { CityModels } from "../../models/schema/admin/City";
import { CountryModel } from "../../models/schema/admin/Country";

export const createzone = async (req: Request, res: Response) => {
  const { name, ar_name, cityId, countryId, cost } = req.body;

  if (!name || !ar_name || !cityId || !countryId || cost === undefined)
    throw new BadRequest("All fields are required");

  const cityExists = await CityModels.findById(cityId);
  if (!cityExists) throw new BadRequest("City not found");

  const countryExists = await CountryModel.findById(countryId);
  if (!countryExists) throw new BadRequest("Country not found");

  const Zoneexists = await ZoneModel.findOne({ name });
  if (Zoneexists) throw new BadRequest("Zone already exists");

  // ✅ تحويل القيم لأرقام قبل الجمع
  const cityCost = Number(cityExists.shipingCost) || 0;
  const zoneCost = Number(cost) || 0;
  const totalshipingcost = cityCost + zoneCost;



  const zone = await ZoneModel.create({
    name,
    ar_name,
    cityId,
    countryId,
    cost,
    shipingCost: totalshipingcost
  });

  SuccessResponse(res, { message: "Zone created successfully", zone });
};


export const getZones = async (req: Request, res: Response) => {
  const zones = await ZoneModel.find()
    .populate("cityId", "name shipingCost ar_name ")
    .populate("countryId", "name ar_name ");

  SuccessResponse(res, {
    message: "Zones fetched successfully",
    zones,
  });
};

export const getZoneById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Zone id is required");

  const zone = await ZoneModel.findById(id)
    .populate("cityId", "name shipingCost ar_name ")
    .populate("countryId", "name ar_name ");

  if (!zone) throw new NotFound("Zone not found");

  SuccessResponse(res, {
    message: "Zone fetched successfully",
    zone,
  });
};


export const deleteZone = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Zone id is required");
  const zone = await ZoneModel.findByIdAndDelete(id);
  if (!zone) throw new NotFound("Zone not found");
  SuccessResponse(res, { message: "Zone deleted successfully" });
}

export const updateZone = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Zone id is required");

  const existingZone = await ZoneModel.findById(id);
  if (!existingZone) throw new NotFound("Zone not found");

  const { name, ar_name, cityId, countryId, cost } = req.body;

  // Check for duplicate name (exclude current zone)
  if (name) {
    const duplicate = await ZoneModel.findOne({ name, _id: { $ne: id } });
    if (duplicate) throw new BadRequest("Zone with this name already exists");
  }

  // Verify city exists if cityId is being updated
  const resolvedCityId = cityId || existingZone.cityId;
  const cityExists = await CityModels.findById(resolvedCityId);
  if (!cityExists) throw new BadRequest("City not found");

  // Verify country exists if countryId is being updated
  const resolvedCountryId = countryId || existingZone.countryId;
  const countryExists = await CountryModel.findById(resolvedCountryId);
  if (!countryExists) throw new BadRequest("Country not found");

  // Recalculate shipping cost
  const cityCost = Number(cityExists.shipingCost) || 0;
  const zoneCost = Number(cost !== undefined ? cost : existingZone.cost) || 0;
  const totalshipingcost = cityCost + zoneCost;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (ar_name !== undefined) updateData.ar_name = ar_name;
  if (cityId !== undefined) updateData.cityId = cityId;
  if (countryId !== undefined) updateData.countryId = countryId;
  if (cost !== undefined) updateData.cost = cost;
  updateData.shipingCost = totalshipingcost;

  const zone = await ZoneModel.findByIdAndUpdate(id, updateData, { new: true });

  SuccessResponse(res, { message: "Zone updated successfully", zone });
};

export const getCountriesWithCities = async (req: Request, res: Response) => {
  const countries = await CountryModel.find().populate("cities");

  SuccessResponse(res, {
    message: "Countries with cities fetched successfully",
    countries,
  });
};