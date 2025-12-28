"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDiscountById = exports.deleteDiscount = exports.updateDiscount = exports.getAllDiscounts = exports.createDiscount = void 0;
const Discount_1 = require("../../models/schema/admin/Discount");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const BadRequest_1 = require("../../Errors/BadRequest");
const createDiscount = async (req, res) => {
    const { name, amount, type, status } = req.body;
    const existingDiscount = await Discount_1.DiscountModel.findOne({ name });
    if (existingDiscount)
        throw new BadRequest_1.BadRequest("Discount already exists");
    const discount = await Discount_1.DiscountModel.create({ name, amount, type, status });
    (0, response_1.SuccessResponse)(res, { message: "Discount created successfully", discount });
};
exports.createDiscount = createDiscount;
const getAllDiscounts = async (req, res) => {
    const discounts = await Discount_1.DiscountModel.find();
    (0, response_1.SuccessResponse)(res, { message: "Discounts retrieved successfully", discounts });
};
exports.getAllDiscounts = getAllDiscounts;
const updateDiscount = async (req, res) => {
    const { id } = req.params;
    const discount = await Discount_1.DiscountModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!discount)
        throw new Errors_1.NotFound("Discount not found");
    (0, response_1.SuccessResponse)(res, { message: "Discount updated successfully", discount });
};
exports.updateDiscount = updateDiscount;
const deleteDiscount = async (req, res) => {
    const { id } = req.params;
    const discount = await Discount_1.DiscountModel.findByIdAndDelete(id);
    if (!discount)
        throw new Errors_1.NotFound("Discount not found");
    (0, response_1.SuccessResponse)(res, { message: "Discount deleted successfully", discount });
};
exports.deleteDiscount = deleteDiscount;
const getDiscountById = async (req, res) => {
    const { id } = req.params;
    const discount = await Discount_1.DiscountModel.findById(id);
    if (!discount)
        throw new Errors_1.NotFound("Discount not found");
    (0, response_1.SuccessResponse)(res, { message: "Discount retrieved successfully", discount });
};
exports.getDiscountById = getDiscountById;
