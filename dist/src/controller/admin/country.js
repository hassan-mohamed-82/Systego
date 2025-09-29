"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCountry = exports.updateCountry = exports.createCountry = exports.getCountryById = exports.getCountries = void 0;
const response_1 = require("../../utils/response");
const Country_1 = require("../../models/schema/users/Country");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors/");
const getCountries = async (req, res) => {
    const countries = await Country_1.Country.find();
    if (!countries || countries.length === 0)
        throw new Errors_1.NotFound("No countries found");
    (0, response_1.SuccessResponse)(res, { message: "get all countries successfully", countries });
};
exports.getCountries = getCountries;
const getCountryById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Country id is required");
    const country = await Country_1.Country.findById(id);
    if (!country)
        throw new Errors_1.NotFound("Country not found");
    (0, response_1.SuccessResponse)(res, { message: "get country successfully", country });
};
exports.getCountryById = getCountryById;
const createCountry = async (req, res) => {
    const { name } = req.body;
    if (!name)
        throw new BadRequest_1.BadRequest("Country name, code and phone code are required");
    const existingCountry = await Country_1.Country.findOne({ name });
    if (existingCountry)
        throw new BadRequest_1.BadRequest("Country already exists");
    const country = await Country_1.Country.create({ name });
    (0, response_1.SuccessResponse)(res, { message: "create country successfully", country });
};
exports.createCountry = createCountry;
const updateCountry = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Country id is required");
    const updateData = { ...req.body };
    const country = await Country_1.Country.findByIdAndUpdate(id, updateData, { new: true });
    if (!country)
        throw new Errors_1.NotFound("Country not found");
    (0, response_1.SuccessResponse)(res, { message: "update country successfully", country });
};
exports.updateCountry = updateCountry;
const deleteCountry = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Country id is required");
    const country = await Country_1.Country.findByIdAndDelete(id);
    if (!country)
        throw new Errors_1.NotFound("Country not found");
    (0, response_1.SuccessResponse)(res, { message: "delete country successfully", country });
};
exports.deleteCountry = deleteCountry;
