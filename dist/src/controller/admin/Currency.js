"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCurrency = exports.deleteCurrency = exports.getCurrencyById = exports.getCurrencies = exports.createCurrency = void 0;
const Currency_1 = require("../../models/schema/admin/Currency");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const createCurrency = async (req, res) => {
    const { name, ar_name } = req.body;
    if (!name)
        throw new BadRequest_1.BadRequest("Currency name is required");
    const existingCurrency = await Currency_1.CurrencyModel.findOne({ name });
    if (existingCurrency)
        throw new BadRequest_1.BadRequest("Currency already exists");
    const currency = await Currency_1.CurrencyModel.create({ name, ar_name });
    (0, response_1.SuccessResponse)(res, { message: "Currency created successfully", currency });
};
exports.createCurrency = createCurrency;
const getCurrencies = async (req, res) => {
    const currencies = await Currency_1.CurrencyModel.find();
    if (!currencies || currencies.length === 0)
        throw new Errors_1.NotFound("No currencies found");
    (0, response_1.SuccessResponse)(res, { message: "Get currencies successfully", currencies });
};
exports.getCurrencies = getCurrencies;
const getCurrencyById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Currency ID is required");
    const currency = await Currency_1.CurrencyModel.findById(id);
    if (!currency)
        throw new Errors_1.NotFound("Currency not found");
    (0, response_1.SuccessResponse)(res, { message: "Get currency successfully", currency });
};
exports.getCurrencyById = getCurrencyById;
const deleteCurrency = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Currency ID is required");
    const currency = await Currency_1.CurrencyModel.findByIdAndDelete(id);
    if (!currency)
        throw new Errors_1.NotFound("Currency not found");
    (0, response_1.SuccessResponse)(res, { message: "Currency deleted successfully", currency });
};
exports.deleteCurrency = deleteCurrency;
const updateCurrency = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Currency ID is required");
    const currency = await Currency_1.CurrencyModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!currency)
        throw new Errors_1.NotFound("Currency not found");
    (0, response_1.SuccessResponse)(res, { message: "Currency updated successfully", currency });
};
exports.updateCurrency = updateCurrency;
