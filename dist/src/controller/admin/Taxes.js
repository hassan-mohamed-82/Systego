"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTaxes = exports.deleteTaxes = exports.getTaxesById = exports.getTaxes = exports.createTaxes = void 0;
const Taxes_1 = require("../../models/schema/admin/Taxes");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const createTaxes = async (req, res) => {
    const { name, status, amount, type } = req.body;
    if (!name || !amount || !type) {
        throw new BadRequest_1.BadRequest(" name, amount, type  are required");
    }
    const existingTax = await Taxes_1.TaxesModel.findOne({ name });
    if (existingTax)
        throw new BadRequest_1.BadRequest("Tax already exists");
    const tax = await Taxes_1.TaxesModel.create({ name, status, amount, type });
    (0, response_1.SuccessResponse)(res, { message: "Tax created successfully", tax });
};
exports.createTaxes = createTaxes;
const getTaxes = async (req, res) => {
    const taxes = await Taxes_1.TaxesModel.find();
    if (!taxes || taxes.length === 0)
        throw new Errors_1.NotFound("No taxes found");
    (0, response_1.SuccessResponse)(res, { message: "Get taxes successfully", taxes });
};
exports.getTaxes = getTaxes;
const getTaxesById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Tax ID is required");
    const tax = await Taxes_1.TaxesModel.findById(id);
    if (!tax)
        throw new Errors_1.NotFound("Tax not found");
    (0, response_1.SuccessResponse)(res, { message: "Get tax successfully", tax });
};
exports.getTaxesById = getTaxesById;
const deleteTaxes = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Tax ID is required");
    const tax = await Taxes_1.TaxesModel.findByIdAndDelete(id);
    if (!tax)
        throw new Errors_1.NotFound("Tax not found");
    (0, response_1.SuccessResponse)(res, { message: "Tax deleted successfully", tax });
};
exports.deleteTaxes = deleteTaxes;
const updateTaxes = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Tax ID is required");
    const tax = await Taxes_1.TaxesModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!tax)
        throw new Errors_1.NotFound("Tax not found");
    (0, response_1.SuccessResponse)(res, { message: "Tax updated successfully", tax });
};
exports.updateTaxes = updateTaxes;
