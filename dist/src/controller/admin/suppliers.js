"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSupplier = exports.updateSupplier = exports.getSupplierById = exports.getSuppliers = exports.createSupplier = void 0;
const suppliers_1 = require("../../models/schema/admin/suppliers");
const handleImages_1 = require("../../utils/handleImages");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const City_1 = require("../../models/schema/admin/City");
const Country_1 = require("../../models/schema/admin/Country");
// 🟢 Create Supplier
const createSupplier = async (req, res) => {
    const { image, username, email, phone_number, address, cityId, countryId, company_name } = req.body;
    if (!username || !email || !phone_number || !cityId || !countryId) {
        throw new BadRequest_1.BadRequest("Username, email, city, country, and phone number are required");
    }
    const existingSupplier = await suppliers_1.SupplierModel.findOne({
        $or: [{ username }, { email }, { phone_number }],
    });
    if (existingSupplier)
        throw new BadRequest_1.BadRequest("Supplier with given username, email, or phone number already exists");
    let imageUrl = "";
    if (image) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "suppliers");
    }
    const supplier = await suppliers_1.SupplierModel.create({
        image: imageUrl,
        username,
        email,
        phone_number,
        address,
        cityId,
        countryId,
        company_name
    });
    (0, response_1.SuccessResponse)(res, { message: "Supplier created successfully", supplier });
};
exports.createSupplier = createSupplier;
// 🟡 Get All Suppliers
const getSuppliers = async (req, res) => {
    const suppliers = await suppliers_1.SupplierModel.find().populate("cityId").populate("countryId");
    if (!suppliers || suppliers.length === 0) {
        throw new Errors_1.NotFound("No suppliers found");
    }
    const city = await City_1.CityModels.find();
    const country = await Country_1.CountryModel.find();
    (0, response_1.SuccessResponse)(res, { message: "Suppliers retrieved successfully", suppliers, city, country });
};
exports.getSuppliers = getSuppliers;
// 🔵 Get Supplier By ID
const getSupplierById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Supplier ID is required");
    const supplier = await suppliers_1.SupplierModel.findById(id).populate("cityId").populate("countryId");
    if (!supplier)
        throw new Errors_1.NotFound("Supplier not found");
    const city = await City_1.CityModels.find();
    const country = await Country_1.CountryModel.find();
    (0, response_1.SuccessResponse)(res, { message: "Supplier retrieved successfully", supplier, city, country });
};
exports.getSupplierById = getSupplierById;
// 🟠 Update Supplier
const updateSupplier = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Supplier ID is required");
    const updateData = { ...req.body };
    if (req.body.image) {
        updateData.image = await (0, handleImages_1.saveBase64Image)(req.body.image, Date.now().toString(), req, "suppliers");
    }
    const supplier = await suppliers_1.SupplierModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!supplier)
        throw new Errors_1.NotFound("Supplier not found");
    (0, response_1.SuccessResponse)(res, { message: "Supplier updated successfully", supplier });
};
exports.updateSupplier = updateSupplier;
// 🔴 Delete Supplier
const deleteSupplier = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Supplier ID is required");
    const supplier = await suppliers_1.SupplierModel.findByIdAndDelete(id);
    if (!supplier)
        throw new Errors_1.NotFound("Supplier not found");
    (0, response_1.SuccessResponse)(res, { message: "Supplier deleted successfully" });
};
exports.deleteSupplier = deleteSupplier;
