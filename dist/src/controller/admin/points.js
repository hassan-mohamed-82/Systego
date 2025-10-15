"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getpoint = exports.getpoints = exports.deletepoint = exports.updatepoint = exports.createpoint = void 0;
const points_1 = require("../../models/schema/admin/points");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const createpoint = async (req, res) => {
    const { amount, points } = req.body;
    if (!amount || !points)
        throw new BadRequest_1.BadRequest("Please provide all required fields");
    const point = new points_1.PointModel({ amount, points });
    await point.save();
    (0, response_1.SuccessResponse)(res, { message: "Point created successfully", point });
};
exports.createpoint = createpoint;
const updatepoint = async (req, res) => {
    const { id } = req.params;
    const { amount, points } = req.body;
    if (!amount || !points)
        throw new BadRequest_1.BadRequest("Please provide all required fields");
    const point = await points_1.PointModel.findById(id);
    if (!point)
        throw new Errors_1.NotFound("Point not found");
    point.amount = amount;
    point.points = points;
    await point.save();
    (0, response_1.SuccessResponse)(res, { message: "Point updated successfully", point });
};
exports.updatepoint = updatepoint;
const deletepoint = async (req, res) => {
    const { id } = req.params;
    const point = await points_1.PointModel.findByIdAndDelete(id);
    if (!point)
        throw new Errors_1.NotFound("Point not found");
    (0, response_1.SuccessResponse)(res, { message: "Point deleted successfully", point });
};
exports.deletepoint = deletepoint;
const getpoints = async (req, res) => {
    const points = await points_1.PointModel.find();
    (0, response_1.SuccessResponse)(res, { message: "Points found successfully", points });
};
exports.getpoints = getpoints;
const getpoint = async (req, res) => {
    const { id } = req.params;
    const point = await points_1.PointModel.findById(id);
    if (!point)
        throw new Errors_1.NotFound("Point not found");
    (0, response_1.SuccessResponse)(res, { message: "Point found successfully", point });
};
exports.getpoint = getpoint;
