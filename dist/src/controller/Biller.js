"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBiller = exports.updateBiller = exports.getBillerById = exports.getBillers = exports.createBiller = void 0;
const Biller_1 = require("../models/schema/Biller");
const BadRequest_1 = require("../Errors/BadRequest");
const Errors_1 = require("../Errors/");
const response_1 = require("../utils/response");
const handleImages_1 = require("../utils/handleImages");
// ✅ Create
const createBiller = async (req, res) => {
    const { name, company_name, vat_number, email, phone_number, address, image } = req.body;
    if (!name || !email || !phone_number) {
        throw new BadRequest_1.BadRequest("Name, email, and phone_number are required");
    }
    let imageUrl = "";
    if (image) {
        imageUrl = await (0, handleImages_1.saveBase64Image)(image, Date.now().toString(), req, "billers");
    }
    const biller = await Biller_1.BillerModel.create({
        name,
        company_name,
        vat_number,
        email,
        phone_number,
        address,
        image: imageUrl,
    });
    (0, response_1.SuccessResponse)(res, { message: "Biller created successfully", biller });
};
exports.createBiller = createBiller;
// ✅ Get All
const getBillers = async (req, res) => {
    const billers = await Biller_1.BillerModel.find();
    if (!billers || billers.length === 0)
        throw new Errors_1.NotFound("No billers found");
    (0, response_1.SuccessResponse)(res, { message: "Get billers successfully", billers });
};
exports.getBillers = getBillers;
// ✅ Get By ID
const getBillerById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Biller ID is required");
    const biller = await Biller_1.BillerModel.findById(id);
    if (!biller)
        throw new Errors_1.NotFound("Biller not found");
    (0, response_1.SuccessResponse)(res, { message: "Get biller successfully", biller });
};
exports.getBillerById = getBillerById;
// ✅ Update
const updateBiller = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Biller ID is required");
    const updateData = { ...req.body, updated_at: new Date() };
    if (req.body.image) {
        updateData.image = await (0, handleImages_1.saveBase64Image)(req.body.image, Date.now().toString(), req, "billers");
    }
    const biller = await Biller_1.BillerModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!biller)
        throw new Errors_1.NotFound("Biller not found");
    (0, response_1.SuccessResponse)(res, { message: "Biller updated successfully", biller });
};
exports.updateBiller = updateBiller;
// ✅ Delete
const deleteBiller = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Biller ID is required");
    const biller = await Biller_1.BillerModel.findByIdAndDelete(id);
    if (!biller)
        throw new Errors_1.NotFound("Biller not found");
    (0, response_1.SuccessResponse)(res, { message: "Biller deleted successfully" });
};
exports.deleteBiller = deleteBiller;
