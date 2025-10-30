"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCountry = exports.updateCountry = exports.createCountry = exports.getCountryById = exports.getCountries = void 0;
const response_1 = require("../../utils/response");
const Country_1 = require("../../models/schema/admin/Country");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors/");
const getCountries = async (req, res) => {
    const countries = await Country_1.CountryModel.find();
    if (!countries || countries.length === 0)
        throw new Errors_1.NotFound("No countries found");
    (0, response_1.SuccessResponse)(res, { message: "get all countries successfully", countries });
};
exports.getCountries = getCountries;
const getCountryById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Country id is required");
    const country = await Country_1.CountryModel.findById(id);
    if (!country)
        throw new Errors_1.NotFound("Country not found");
    (0, response_1.SuccessResponse)(res, { message: "get country successfully", country });
};
exports.getCountryById = getCountryById;
const createCountry = async (req, res) => {
    const { name, ar_name, isDefault } = req.body;
    if (!name)
        throw new BadRequest_1.BadRequest("Country name is required");
    const existingCountry = await Country_1.CountryModel.findOne({ name });
    if (existingCountry)
        throw new BadRequest_1.BadRequest("Country already exists");
    const hasDefaultCountry = await Country_1.CountryModel.findOne({ isDefault: true });
    let country;
    // الحالة 1: أول دولة في النظام
    if (!hasDefaultCountry) {
        country = await Country_1.CountryModel.create({ name, ar_name, isDefault: true });
        return (0, response_1.SuccessResponse)(res, {
            message: "Country created as default (first country)",
            country,
        });
    }
    // الحالة 2: لو الدولة الجديدة default
    if (isDefault) {
        await Country_1.CountryModel.updateMany({}, { $set: { isDefault: false } });
        country = await Country_1.CountryModel.create({ name, isDefault: true });
    }
    // الحالة 3: لو الدولة الجديدة مش default
    else {
        // لازم يكون فيه واحدة default بالفعل
        if (!hasDefaultCountry)
            throw new BadRequest_1.BadRequest("At least one country must be default");
        country = await Country_1.CountryModel.create({ name, isDefault: false });
    }
    (0, response_1.SuccessResponse)(res, { message: "Country created successfully", country });
};
exports.createCountry = createCountry;
const updateCountry = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Country id is required");
    const updateData = { ...req.body };
    const existingCountry = await Country_1.CountryModel.findById(id);
    if (!existingCountry)
        throw new Errors_1.NotFound("Country not found");
    // الحالة 1️⃣: لو المستخدم بيخلي البلد دي Default
    if (updateData.isDefault === true) {
        // نلغي الـ default من أي بلد تانية
        await Country_1.CountryModel.updateMany({}, { $set: { isDefault: false } });
        updateData.isDefault = true;
    }
    // الحالة 2️⃣: لو المستخدم بيشيل الـ default (بيخليها false)
    if (updateData.isDefault === false) {
        // نتحقق هل دي آخر default ولا لأ
        const hasOtherDefault = await Country_1.CountryModel.findOne({
            _id: { $ne: id },
            isDefault: true,
        });
        // لو مفيش غيرها default → نمنع العملية
        if (!hasOtherDefault) {
            throw new BadRequest_1.BadRequest("At least one country must remain as default");
        }
    }
    const country = await Country_1.CountryModel.findByIdAndUpdate(id, updateData, {
        new: true,
    });
    (0, response_1.SuccessResponse)(res, { message: "Country updated successfully", country });
};
exports.updateCountry = updateCountry;
const deleteCountry = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Country id is required");
    const country = await Country_1.CountryModel.findByIdAndDelete(id);
    if (!country)
        throw new Errors_1.NotFound("Country not found");
    (0, response_1.SuccessResponse)(res, { message: "delete country successfully", country });
};
exports.deleteCountry = deleteCountry;
