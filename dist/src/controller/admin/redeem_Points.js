"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getpoint = exports.getpoints = exports.deletepoint = exports.updatepoint = exports.createpoint = void 0;
const redeem_Points_1 = require("../../models/schema/admin/redeem_Points");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const createpoint = async (req, res) => {
    const { amount, points } = req.body;
    if (!amount || !points)
        throw new BadRequest_1.BadRequest("Please provide all required fields");
    const point = new redeem_Points_1.redeem_PointsModel({ amount, points });
    await point.save();
    (0, response_1.SuccessResponse)(res, { message: "Point created successfully", point });
};
exports.createpoint = createpoint;
const updatepoint = async (req, res) => {
    const { id } = req.params;
    const { amount, points } = req.body;
    if (!amount || !points)
        throw new BadRequest_1.BadRequest("Please provide all required fields");
    const point = await redeem_Points_1.redeem_PointsModel.findById(id);
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
    const point = await redeem_Points_1.redeem_PointsModel.findByIdAndDelete(id);
    if (!point)
        throw new Errors_1.NotFound("Point not found");
    (0, response_1.SuccessResponse)(res, { message: "Point deleted successfully", point });
};
exports.deletepoint = deletepoint;
const getpoints = async (req, res) => {
    const points = await redeem_Points_1.redeem_PointsModel.find();
    (0, response_1.SuccessResponse)(res, { message: "Points found successfully", points });
};
exports.getpoints = getpoints;
const getpoint = async (req, res) => {
    const { id } = req.params;
    const point = await redeem_Points_1.redeem_PointsModel.findById(id);
    if (!point)
        throw new Errors_1.NotFound("Point not found");
    (0, response_1.SuccessResponse)(res, { message: "Point found successfully", point });
};
exports.getpoint = getpoint;
