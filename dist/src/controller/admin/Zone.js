"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCountriesWithCities = exports.updateZone = exports.deleteZone = exports.getZoneById = exports.getZones = exports.createzone = void 0;
const Zone_1 = require("../../models/schema/admin/Zone");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const City_1 = require("../../models/schema/admin/City");
const Country_1 = require("../../models/schema/admin/Country");
const createzone = async (req, res) => {
    const { name, ar_name, cityId, countryId, cost } = req.body;
    if (!name || !cityId || !countryId || cost === undefined)
        throw new BadRequest_1.BadRequest("All fields are required");
    const cityExists = await City_1.CityModels.findById(cityId);
    if (!cityExists)
        throw new BadRequest_1.BadRequest("City not found");
    const countryExists = await Country_1.CountryModel.findById(countryId);
    if (!countryExists)
        throw new BadRequest_1.BadRequest("Country not found");
    const Zoneexists = await Zone_1.ZoneModel.findOne({ name });
    if (Zoneexists)
        throw new BadRequest_1.BadRequest("Zone already exists");
    // ✅ تحويل القيم لأرقام قبل الجمع
    const cityCost = Number(cityExists.shipingCost) || 0;
    const zoneCost = Number(cost) || 0;
    const totalshipingcost = cityCost + zoneCost;
    console.log("City Cost:", cityCost, "Zone Cost:", zoneCost, "Total:", totalshipingcost);
    const zone = await Zone_1.ZoneModel.create({
        name,
        ar_name,
        cityId,
        countryId,
        cost,
        shipingCost: totalshipingcost
    });
    (0, response_1.SuccessResponse)(res, { message: "Zone created successfully", zone });
};
exports.createzone = createzone;
const getZones = async (req, res) => {
    const zones = await Zone_1.ZoneModel.find()
        .populate("cityId", "name shipingCost ar_name ")
        .populate("countryId", "name ar_name ");
    (0, response_1.SuccessResponse)(res, {
        message: "Zones fetched successfully",
        zones,
    });
};
exports.getZones = getZones;
const getZoneById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Zone id is required");
    const zone = await Zone_1.ZoneModel.findById(id)
        .populate("cityId", "name shipingCost ar_name ")
        .populate("countryId", "name ar_name ");
    if (!zone)
        throw new Errors_1.NotFound("Zone not found");
    (0, response_1.SuccessResponse)(res, {
        message: "Zone fetched successfully",
        zone,
    });
};
exports.getZoneById = getZoneById;
const deleteZone = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Zone id is required");
    const zone = await Zone_1.ZoneModel.findByIdAndDelete(id);
    if (!zone)
        throw new Errors_1.NotFound("Zone not found");
    (0, response_1.SuccessResponse)(res, { message: "Zone deleted successfully" });
};
exports.deleteZone = deleteZone;
const updateZone = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Zone id is required");
    const existingZone = await Zone_1.ZoneModel.findById(id);
    if (!existingZone)
        throw new Errors_1.NotFound("Zone not found");
    const { name, ar_name, cityId, countryId, cost } = req.body;
    // Check for duplicate name (exclude current zone)
    if (name) {
        const duplicate = await Zone_1.ZoneModel.findOne({ name, _id: { $ne: id } });
        if (duplicate)
            throw new BadRequest_1.BadRequest("Zone with this name already exists");
    }
    // Verify city exists if cityId is being updated
    const resolvedCityId = cityId || existingZone.cityId;
    const cityExists = await City_1.CityModels.findById(resolvedCityId);
    if (!cityExists)
        throw new BadRequest_1.BadRequest("City not found");
    // Verify country exists if countryId is being updated
    const resolvedCountryId = countryId || existingZone.countryId;
    const countryExists = await Country_1.CountryModel.findById(resolvedCountryId);
    if (!countryExists)
        throw new BadRequest_1.BadRequest("Country not found");
    // Recalculate shipping cost
    const cityCost = Number(cityExists.shipingCost) || 0;
    const zoneCost = Number(cost !== undefined ? cost : existingZone.cost) || 0;
    const totalshipingcost = cityCost + zoneCost;
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (ar_name !== undefined)
        updateData.ar_name = ar_name;
    if (cityId !== undefined)
        updateData.cityId = cityId;
    if (countryId !== undefined)
        updateData.countryId = countryId;
    if (cost !== undefined)
        updateData.cost = cost;
    updateData.shipingCost = totalshipingcost;
    const zone = await Zone_1.ZoneModel.findByIdAndUpdate(id, updateData, { new: true });
    (0, response_1.SuccessResponse)(res, { message: "Zone updated successfully", zone });
};
exports.updateZone = updateZone;
const getCountriesWithCities = async (req, res) => {
    const countries = await Country_1.CountryModel.find().populate("cities");
    (0, response_1.SuccessResponse)(res, {
        message: "Countries with cities fetched successfully",
        countries,
    });
};
exports.getCountriesWithCities = getCountriesWithCities;
