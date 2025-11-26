"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creatematerial = exports.deleteMaterial = exports.getMaterial = exports.getMaterials = void 0;
const Materials_1 = require("../../models/schema/admin/Materials");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const deleteImage_1 = require("../../utils/deleteImage");
const getMaterials = async (req, res) => {
    const materials = await Materials_1.MaterialModel.find();
    return (0, response_1.SuccessResponse)(res, { message: "fetched successfully", materials });
};
exports.getMaterials = getMaterials;
const getMaterial = async (req, res) => {
    const { matrialId } = req.params;
    if (!matrialId)
        throw new BadRequest_1.BadRequest("material id is required");
    const material = await Materials_1.MaterialModel.findById(matrialId).populate("category_id", "name ar_name photo ");
    if (!material)
        throw new Errors_1.NotFound("material not found");
    return (0, response_1.SuccessResponse)(res, { message: "fetched successfully", material });
};
exports.getMaterial = getMaterial;
const deleteMaterial = async (req, res) => {
    const { matrialId } = req.params;
    if (!matrialId)
        throw new BadRequest_1.BadRequest("material id is required");
    const material = await Materials_1.MaterialModel.findByIdAndDelete(matrialId);
    if (!material)
        throw new Errors_1.NotFound("material not found");
    if (material.photo != null)
        (0, deleteImage_1.deletePhotoFromServer)(material.photo);
    return (0, response_1.SuccessResponse)(res, { message: "material deleted successfully" });
};
exports.deleteMaterial = deleteMaterial;
const creatematerial = async (req, res) => {
    const { name, ar_name, photo, description, ar_description, category_id, quantity, expired_ability, date_of_expiry, low_stock, unit } = req.body;
    const material = await Materials_1.MaterialModel.create({ name, ar_name, photo, description, ar_description, category_id, quantity, expired_ability, date_of_expiry, low_stock, unit });
    return (0, response_1.SuccessResponse)(res, { message: "material created successfully", material });
};
exports.creatematerial = creatematerial;
