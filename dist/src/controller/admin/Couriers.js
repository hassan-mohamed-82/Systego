"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCourier = exports.updateCourier = exports.getCourierById = exports.getCouriers = exports.createCourier = void 0;
const Couriers_1 = require("../../models/schema/admin/Couriers");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const createCourier = async (req, res) => {
    const { name, phone_number, address } = req.body;
    if (!name || !phone_number || !address)
        throw new BadRequest_1.BadRequest("All fields are required");
    const courier = await Couriers_1.CourierModel.create({ name, phone_number, address });
    (0, response_1.SuccessResponse)(res, { message: "Courier created successfully", courier });
};
exports.createCourier = createCourier;
const getCouriers = async (req, res) => {
    const couriers = await Couriers_1.CourierModel.find();
    if (!couriers || couriers.length === 0)
        throw new Errors_1.NotFound("No couriers found");
    (0, response_1.SuccessResponse)(res, { message: "Get couriers successfully", couriers });
};
exports.getCouriers = getCouriers;
const getCourierById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Courier ID is required");
    const courier = await Couriers_1.CourierModel.findById(id);
    if (!courier)
        throw new Errors_1.NotFound("Courier not found");
    (0, response_1.SuccessResponse)(res, { message: "Get courier successfully", courier });
};
exports.getCourierById = getCourierById;
const updateCourier = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Courier ID is required");
    const courier = await Couriers_1.CourierModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!courier)
        throw new Errors_1.NotFound("Courier not found");
    (0, response_1.SuccessResponse)(res, { message: "Courier updated successfully", courier });
};
exports.updateCourier = updateCourier;
const deleteCourier = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Courier ID is required");
    const courier = await Couriers_1.CourierModel.findByIdAndDelete(id);
    if (!courier)
        throw new Errors_1.NotFound("Courier not found");
    (0, response_1.SuccessResponse)(res, { message: "Courier deleted successfully" });
};
exports.deleteCourier = deleteCourier;
