"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCity = exports.updateCity = exports.getCityById = exports.getCities = exports.createCity = void 0;
const response_1 = require("../../utils/response");
const City_1 = require("../../models/schema/admin/City");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors/");
const Country_1 = require("../../models/schema/admin/Country");
const Zone_1 = require("../../models/schema/admin/Zone");
const createCity = async (req, res) => {
    const { name, ar_name, country, shipingCost } = req.body;
    if (!name || !ar_name || !country || shipingCost === undefined) {
        throw new BadRequest_1.BadRequest("name, ar_name, country, and shipingCost are required");
    }
    const countryExists = await Country_1.CountryModel.findById(country);
    if (!countryExists)
        throw new Errors_1.NotFound("Country not found");
    const existingCity = await City_1.CityModels.findOne({ name, country });
    if (existingCity)
        throw new BadRequest_1.BadRequest("City already exists in this country");
    const city = await City_1.CityModels.create({ name, ar_name, country, shipingCost });
    await city.populate("country");
    (0, response_1.SuccessResponse)(res, { message: "City created successfully", city });
};
exports.createCity = createCity;
const getCities = async (req, res) => {
    const cities = await City_1.CityModels.find().populate("country");
    const countries = await Country_1.CountryModel.find();
    (0, response_1.SuccessResponse)(res, { message: "Cities fetched successfully", cities, countries });
};
exports.getCities = getCities;
const getCityById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("City id is required");
    const city = await City_1.CityModels.findById(id).populate("country");
    if (!city)
        throw new Errors_1.NotFound("City not found");
    (0, response_1.SuccessResponse)(res, { message: "City fetched successfully", city });
};
exports.getCityById = getCityById;
const updateCity = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("City id is required");
    const existingCity = await City_1.CityModels.findById(id);
    if (!existingCity)
        throw new Errors_1.NotFound("City not found");
    const { name, ar_name, country, shipingCost } = req.body;
    // Check for duplicate name in the same country
    if (name) {
        const resolvedCountry = country || existingCity.country;
        const duplicate = await City_1.CityModels.findOne({ name, country: resolvedCountry, _id: { $ne: id } });
        if (duplicate)
            throw new BadRequest_1.BadRequest("City with this name already exists in this country");
    }
    // Verify country exists if being updated
    if (country) {
        const countryExists = await Country_1.CountryModel.findById(country);
        if (!countryExists)
            throw new Errors_1.NotFound("Country not found");
    }
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (ar_name !== undefined)
        updateData.ar_name = ar_name;
    if (country !== undefined)
        updateData.country = country;
    if (shipingCost !== undefined)
        updateData.shipingCost = shipingCost;
    const city = await City_1.CityModels.findByIdAndUpdate(id, updateData, { new: true }).populate("country");
    // If shipingCost changed, recalculate shipingCost for all zones in this city
    if (shipingCost !== undefined) {
        const zones = await Zone_1.ZoneModel.find({ cityId: id });
        for (const zone of zones) {
            const cityCost = Number(shipingCost) || 0;
            const zoneCost = Number(zone.cost) || 0;
            await Zone_1.ZoneModel.findByIdAndUpdate(zone._id, { shipingCost: cityCost + zoneCost });
        }
    }
    (0, response_1.SuccessResponse)(res, { message: "City updated successfully", city });
};
exports.updateCity = updateCity;
const deleteCity = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("City id is required");
    const city = await City_1.CityModels.findByIdAndDelete(id);
    if (!city)
        throw new Errors_1.NotFound("City not found");
    // Delete all zones belonging to this city
    await Zone_1.ZoneModel.deleteMany({ cityId: id });
    (0, response_1.SuccessResponse)(res, { message: "City deleted successfully" });
};
exports.deleteCity = deleteCity;
