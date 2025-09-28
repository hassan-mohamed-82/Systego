"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBrandById = exports.getAllBrands = void 0;
const brand_1 = require("../../models/schema/admin/brand");
const NotFound_1 = require("../../Errors/NotFound");
const response_1 = require("../../utils/response");
const getAllBrands = async (req, res) => {
    const brands = await brand_1.BrandModel.find()
        .sort({ created_at: -1 });
    (0, response_1.SuccessResponse)(res, { message: 'Brands retrieved successfully', data: brands }, 200);
};
exports.getAllBrands = getAllBrands;
const getBrandById = async (req, res) => {
    const id = req.params.id;
    const brand = await brand_1.BrandModel.findOne({ _id: id });
    if (!brand) {
        throw new NotFound_1.NotFound('Brand not found');
    }
    (0, response_1.SuccessResponse)(res, { message: 'Brand retrieved successfully', data: brand }, 200);
};
exports.getBrandById = getBrandById;
