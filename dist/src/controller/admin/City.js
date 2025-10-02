"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCity = exports.updateCity = exports.getCityById = exports.getCities = exports.createCity = void 0;
const response_1 = require("../../utils/response");
const City_1 = require("../../models/schema/admin/City");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors/");
const Country_1 = require("../../models/schema/admin/Country");
const createCity = async (req, res) => {
    const { name, country, shippingCost } = req.body;
    if (!name || !country || shippingCost === undefined) {
        throw new BadRequest_1.BadRequest("City name, country and shippingCost are required");
    }
    const existingCity = await City_1.CityModels.findOne({ name, country });
    if (existingCity)
        throw new BadRequest_1.BadRequest("City already exists in this country");
    const countryExists = await Country_1.CountryModel.findById(country);
    if (!countryExists)
        throw new Errors_1.NotFound("Country not found");
    const city = await City_1.CityModels.create({ name, country, shippingCost });
    await city.populate("country");
    (0, response_1.SuccessResponse)(res, { message: "create city successfully", city });
};
exports.createCity = createCity;
// Get All Cities
const getCities = async (req, res) => {
    const cities = await City_1.CityModels.find().populate("country");
    if (!cities || cities.length === 0)
        throw new Errors_1.NotFound("No cities found");
    (0, response_1.SuccessResponse)(res, { message: "get all cities successfully", cities });
};
exports.getCities = getCities;
// Get City by Id
const getCityById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("City id is required");
    const city = await City_1.CityModels.findById(id).populate("country");
    if (!city)
        throw new Errors_1.NotFound("City not found");
    (0, response_1.SuccessResponse)(res, { message: "get city successfully", city });
};
exports.getCityById = getCityById;
// Update City
const updateCity = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("City id is required");
    const updateData = { ...req.body };
    if (req.body.country) {
        const countryExists = await Country_1.CountryModel.findById(req.body.country);
        if (!countryExists)
            throw new Errors_1.NotFound("Country not found");
    }
    const city = await City_1.CityModels.findByIdAndUpdate(id, updateData, { new: true }).populate("country");
    if (!city)
        throw new Errors_1.NotFound("City not found");
    (0, response_1.SuccessResponse)(res, { message: "update city successfully", city });
};
exports.updateCity = updateCity;
// Delete City
const deleteCity = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("City id is required");
    const city = await City_1.CityModels.findByIdAndDelete(id);
    if (!city)
        throw new Errors_1.NotFound("City not found");
    (0, response_1.SuccessResponse)(res, { message: "delete city successfully", city });
};
exports.deleteCity = deleteCity;
